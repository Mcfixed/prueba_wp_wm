import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@whatsappmanager.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'admin@whatsappmanager.com',
      passwordHash: adminPassword,
      name: 'Administrador',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create operator user
  const operatorPassword = await bcrypt.hash('operator123', 12);
  const operator = await prisma.user.upsert({
    where: { email: 'operator@whatsappmanager.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'operator@whatsappmanager.com',
      passwordHash: operatorPassword,
      name: 'Operador Principal',
      role: Role.OPERATOR,
    },
  });
  console.log(`✅ Operator user created: ${operator.email}`);

  // Create viewer user
  const viewerPassword = await bcrypt.hash('viewer123', 12);
  await prisma.user.upsert({
    where: { email: 'viewer@whatsappmanager.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'viewer@whatsappmanager.com',
      passwordHash: viewerPassword,
      name: 'Visualizador',
      role: Role.VIEWER,
    },
  });
  console.log(`✅ Viewer user created`);

  // Create sample sessions
  const sampleSessions = [
    { name: 'Sucursal Norte', description: 'WhatsApp de la sucursal norte' },
    { name: 'Sucursal Sur', description: 'WhatsApp de la sucursal sur' },
    { name: 'Soporte Técnico', description: 'Línea de soporte técnico' },
  ];

  for (const s of sampleSessions) {
    await prisma.session.create({
      data: {
        id: randomUUID(),
        name: s.name,
        description: s.description,
        state: 'CREATED',
        userId: admin.id,
      },
    });
  }
  console.log(`✅ ${sampleSessions.length} sample sessions created`);

  // Create default alert rules for admin
  const sessions = await prisma.session.findMany({ where: { userId: admin.id } });
  for (const session of sessions) {
    await prisma.alertRule.create({
      data: {
        id: randomUUID(),
        sessionId: session.id,
        userId: admin.id,
        event: 'SESSION_DISCONNECTED',
        channels: ['INTERNAL_LOG', 'SOCKET'],
        enabled: true,
      },
    });
  }
  console.log(`✅ Default alert rules created`);

  // Create SMTP config
  await prisma.emailConfig.create({
    data: {
      id: randomUUID(),
      userId: admin.id,
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      username: 'tu-correo@gmail.com',
      password: 'tu-contraseña',
      recipients: ['soporte@empresa.com', 'operaciones@empresa.com'],
    },
  });
  console.log(`✅ SMTP config created`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
