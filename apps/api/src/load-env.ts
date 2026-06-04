import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

for (const file of ['.env', '.env.example']) {
  const envPath = resolve(root, file);
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://dcc:dcc@localhost:5432/dcc';
  console.warn(
    '[dcc-api] DATABASE_URL not set — using default localhost Postgres. Copy .env.example to .env to customize.',
  );
}
