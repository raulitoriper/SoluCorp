import { PrismaService } from '../../src/common/prisma/prisma.service';

// Lista canónica de tablas — orden no importa con CASCADE,
// pero se documenta de hojas a raíz para facilitar lectura.
const TABLES = [
  'courier_items', 'courier_deliveries',
  'medical_visit_products', 'medical_visits',
  'order_items', 'orders',
  'sync_queue',
  'guard_shifts',
  'attendance_events',
  'inventory_records',
  'gps_locations',
  'visits',
  'metadata_items', 'metadata_types',
  'refresh_tokens',
  'users',
  'company_settings', 'company_modules', 'subscriptions',
  'companies',
] as const;

export async function truncateAll(prisma: PrismaService): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? '';

  // GUARDARRAÍL: nunca truncar una DB que no sea explícitamente de test.
  // El literal "test" debe aparecer en el nombre de la base.
  if (!dbUrl.includes('test')) {
    throw new Error(
      `[truncateAll] DATABASE_URL no contiene literal "test". ` +
      `Abortando para proteger datos. URL recibida: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`,
    );
  }

  // Truncate único con CASCADE y RESTART IDENTITY — mucho más rápido que iterar.
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
