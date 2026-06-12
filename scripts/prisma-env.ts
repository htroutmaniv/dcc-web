/**
 * Run Prisma CLI from apps/api with env from repo root (.env + profile).
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadProfileEnv } from './load-profile-env.js';

const root = resolve(import.meta.dirname, '..');
const apiDir = resolve(root, 'apps/api');

loadProfileEnv();

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
