import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const META_TYPES = [
  { code: 'CLIENT', name: 'Cliente' },
  { code: 'PRODUCT', name: 'Producto' },
  { code: 'MOTIVE', name: 'Motivo' },
  { code: 'GUARD', name: 'Guardia' },
  { code: 'DELIVERER', name: 'Repartidor' },
  { code: 'INVOICE_TYPE', name: 'Tipo de Factura' },
  { code: 'EMPLOYEE', name: 'Empleado' },
  { code: 'VEHICLE', name: 'Vehículo' },
  { code: 'BANK', name: 'Banco' },
  { code: 'DEPOSIT', name: 'Depósito' },
  { code: 'CLINIC', name: 'Clínica' },
  { code: 'MEDIC', name: 'Médico' },
  { code: 'CONTACT', name: 'Contacto' },
  { code: 'TICKET_USER', name: 'Usuario Ticket' },
];

const ALL_MODULES = ['VISITS', 'ORDERS', 'GPS_TRACKING', 'INVENTORY', 'ATTENDANCE', 'GUARD_SECURITY', 'MEDICAL_VISITS', 'COURIER', 'METADATA_CRUD'];

async function main() {
  console.log('Sembrando base de datos SoluCorp...\n');

  // 1. SUPER_ADMIN (SoluCorp)
  const superAdminHash = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@solucorp.com.py' },
    update: {},
    create: { email: 'admin@solucorp.com.py', passwordHash: superAdminHash, firstName: 'Admin', lastName: 'SoluCorp', role: 'SUPER_ADMIN' },
  });
  console.log('✓ SuperAdmin:', superAdmin.email);

  // 2. Empresa Demo
  let company = await prisma.company.findUnique({ where: { ruc: '80099999-0' } });
  if (!company) {
    company = await prisma.company.create({
      data: { name: 'Empresa Demo PY', ruc: '80099999-0', phone: '+595 21 555 0000', city: 'Asunción', department: 'Central' },
    });
  }
  console.log('✓ Empresa Demo:', company.name);

  // 3. Suscripción DEMO
  await prisma.subscription.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id, status: 'DEMO', trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });

  // 4. Settings
  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id },
  });

  // 5. Todos los módulos habilitados
  for (const mod of ALL_MODULES) {
    await prisma.companyModule.upsert({
      where: { companyId_module: { companyId: company.id, module: mod as any } },
      update: {},
      create: { companyId: company.id, module: mod as any },
    });
  }
  console.log('✓ Módulos habilitados:', ALL_MODULES.length);

  // 6. Metadata types
  for (const mt of META_TYPES) {
    await prisma.metadataType.upsert({
      where: { companyId_code: { companyId: company.id, code: mt.code } },
      update: {},
      create: { companyId: company.id, ...mt, isSystem: true },
    });
  }
  console.log('✓ Tipos de metadata:', META_TYPES.length);

  // 7. COMPANY_ADMIN
  const adminHash = await bcrypt.hash('demo123', 10);
  const companyAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.solucorp.com.py' },
    update: {},
    create: { companyId: company.id, email: 'admin@demo.solucorp.com.py', passwordHash: adminHash, firstName: 'Admin', lastName: 'Demo', role: 'COMPANY_ADMIN' },
  });
  console.log('✓ Admin de empresa:', companyAdmin.email);

  // 8. FIELD_WORKER
  const workerHash = await bcrypt.hash('campo123', 10);
  const fieldWorker = await prisma.user.upsert({
    where: { email: 'campo@demo.solucorp.com.py' },
    update: {},
    create: { companyId: company.id, email: 'campo@demo.solucorp.com.py', passwordHash: workerHash, firstName: 'Juan', lastName: 'Campo', role: 'FIELD_WORKER' },
  });
  console.log('✓ Trabajador de campo:', fieldWorker.email);

  console.log('\n=== Seed completado ===');
  console.log('SuperAdmin:      admin@solucorp.com.py / admin123');
  console.log('Admin Empresa:   admin@demo.solucorp.com.py / demo123');
  console.log('Trabajador:      campo@demo.solucorp.com.py / campo123');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
