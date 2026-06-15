/**
 * Production startup — run under: bun scripts/with-env.ts production -- bun scripts/prod-run.ts
 */
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function spawnService(name: string, command: string, args: string[]): ChildProcess {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.error(`[${name}] killed (${signal})`);
      shutdown(1);
      return;
    }
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code ?? 1);
    }
  });
  return child;
}

const children: ChildProcess[] = [];
let shuttingDown = false;

function shutdown(code = 0): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('bun', ['scripts/stop-prod.ts']);
run('bun', ['run', 'build']);
run('bun', ['run', 'db:migrate:prod']);
run('docker', ['compose', 'up', '-d', '--force-recreate', 'nginx']);

children.push(spawnService('api', 'bun', ['run', 'start:server']));
children.push(spawnService('web', 'bun', ['run', 'start:bundler']));
