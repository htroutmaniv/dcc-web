/**
 * Root postinstall — skip Prisma generate in CI/Docker when SKIP_POSTINSTALL=1.
 */
if (process.env.SKIP_POSTINSTALL === '1') {
  process.exit(0);
}

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const result = spawnSync('bun', ['run', 'db:generate'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});
process.exit(result.status ?? 1);
