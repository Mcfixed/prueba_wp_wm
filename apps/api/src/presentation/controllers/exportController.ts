import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';

export async function exportSessionsCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Nombre', 'Descripción', 'Estado', 'Teléfono', 'Creado', 'Última Conexión', 'Última Actividad'];
    const rows = sessions.map((s) => [
      s.id,
      s.name,
      s.description || '',
      s.state,
      s.phoneNumber || '',
      s.createdAt.toISOString(),
      s.lastConnectionAt?.toISOString() || '',
      s.lastActivityAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sessions-${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (error) {
    next(error);
  }
}

export async function exportLogsCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logs = await prisma.log.findMany({
      where: req.query.sessionId ? { sessionId: req.query.sessionId as string } : {},
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const headers = ['ID', 'Sesión', 'Evento', 'Severidad', 'Mensaje', 'Fecha'];
    const rows = logs.map((log) => [
      log.id,
      log.sessionId || '',
      log.eventType,
      log.severity,
      log.message.replace(/"/g, '""'),
      log.createdAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=logs-${Date.now()}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
}
