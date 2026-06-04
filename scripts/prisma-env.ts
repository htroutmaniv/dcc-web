/**
 * Run Prisma CLI from apps/api with DATABASE_URL from repo root .env
 * (Prisma only auto-loads .env in the schema directory by default).
 */
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const apiDir = resolve(root, 'apps/api');

for (const file of ['.env', '.env.example']) {
  const envPath = resolve(root, file);
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
    break;
  }
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://dcc:dcc@localhost:5432/dcc';
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error('Usage: bun scripts/prisma-env.ts <prisma-command> [args...]');
  process.exit(1);
}

const result = spawnSync('bunx', ['prisma', ...prismaArgs], {
  cwd: apiDir,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
