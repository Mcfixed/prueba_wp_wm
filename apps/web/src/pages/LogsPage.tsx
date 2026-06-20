import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, FileText, AlertTriangle, Info, XCircle } from 'lucide-react';
import { logApi } from '../services/api';
import { LogEntry } from '../types';
import { clsx } from 'clsx';

const severityIcons = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  CRITICAL: XCircle,
};

const severityColors = {
  INFO: 'text-blue-600',
  WARNING: 'text-yellow-600',
  ERROR: 'text-red-600',
  CRITICAL: 'text-red-600',
};

export function LogsPage() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [eventType, setEventType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, severity, eventType],
    queryFn: () =>
      logApi.list({
        page,
        limit: 50,
        ...(severity && { severity }),
        ...(eventType && { eventType }),
      }),
    refetchInterval: 10000,
  });

  const logs: LogEntry[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Logs del Sistema</h1>
        <div className="flex gap-3">
          <select
            className="input w-auto"
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          >
            <option value="">Todas las severidades</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <select
            className="input w-auto"
            value={eventType}
            onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          >
            <option value="">Todos los eventos</option>
            <option value="connection.update">connection.update</option>
            <option value="messages.upsert">messages.upsert</option>
            <option value="SESSION_CONNECTED">SESSION_CONNECTED</option>
            <option value="SESSION_DISCONNECTED">SESSION_DISCONNECTED</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay logs disponibles</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => {
              const SeverityIcon = severityIcons[log.severity as keyof typeof severityIcons] || Info;
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex items-start gap-3">
                    <SeverityIcon
                      size={18}
                      className={clsx('mt-0.5 flex-shrink-0', severityColors[log.severity as keyof typeof severityColors] || 'text-gray-500')}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{log.eventType}</span>
                        <span className={clsx(
                          'text-xs px-1.5 py-0.5 rounded',
                          log.severity === 'ERROR' || log.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : log.severity === 'WARNING'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        )}>
                          {log.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{log.message}</p>
                      {log.session && (
                        <p className="text-xs text-gray-400 mt-0.5">Sesión: {log.session.name}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="btn-secondary"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
