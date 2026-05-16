import { config } from 'dotenv';
import { resolve } from 'path';

// dotenv ya está en dependencies del backend (^17.4.2).
// Carga .env.test desde apps/api/.env.test (root del workspace api).
config({ path: resolve(__dirname, '../.env.test') });

if (!process.env.DATABASE_URL?.includes('test')) {
  throw new Error(
    `[setup-env] DATABASE_URL debe contener literal "test". ` +
      `Verificá apps/api/.env.test`,
  );
}
