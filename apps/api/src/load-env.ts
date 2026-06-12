import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

function loadEnvFile(file: string, override: boolean): void {
  const envPath = resolve(root, file);
  if (existsSync(envPath)) config({ path: envPath, override });
}

const profile =
  process.env.DCC_ENV === 'production' ? 'production' : 'development';

loadEnvFile('.env', false);
loadEnvFile(`.env.${profile}`, true);
loadEnvFile(`.env.${profile}.local`, true);

if (!process.env.DCC_ENV) {
  process.env.DCC_ENV = profile;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://dcc:dcc@localhost:5432/dcc';
  console.warn(
    '[dcc-api] DATABASE_URL not set — using default localhost Postgres. Copy .env.example to .env to customize.',
  );
}
