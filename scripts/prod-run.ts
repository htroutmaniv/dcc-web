/**
 * Production startup — run under: bun scripts/with-env.ts production -- bun scripts/prod-run.ts
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('bun', ['scripts/stop-prod.ts']);
run('bun', ['run', 'build']);
run('docker', ['compose', 'up', '-d', '--force-recreate', 'nginx']);
run('bunx', [
  'concurrently',
  '-k',
  '-n',
  'api,web',
  'bun run start:server',
  'bun run start:bundler',
]);
