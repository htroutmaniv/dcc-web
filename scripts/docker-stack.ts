/**
 * Docker infrastructure helpers — Postgres + nginx from docker-compose.yml.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** Start Postgres and block until the compose healthcheck passes. */
export function ensurePostgres(): void {
  run('docker', ['compose', 'up', '-d', '--wait', 'postgres']);
}

/** Start or recreate the nginx reverse-proxy container. */
export function ensureNginx(forceRecreate = false): void {
  const args = ['compose', 'up', '-d'];
  if (forceRecreate) args.push('--force-recreate');
  args.push('nginx');
  run('docker', args);
}

/** Postgres (healthy) + nginx — used by dev/prod stack commands. */
export function startDockerStack(forceRecreateNginx = true): void {
  ensurePostgres();
  ensureNginx(forceRecreateNginx);
}
