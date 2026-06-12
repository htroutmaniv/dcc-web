/**
 * Run a command with merged env: .env (secrets) + .env.<development|production>.
 *
 * Usage: bun scripts/with-env.ts development -- docker compose up -d
 */
import { spawnSync } from 'node:child_process';
import { loadProfileEnv, type EnvProfile } from './load-profile-env.js';

const mode = process.argv[2] as EnvProfile | undefined;
const sepIdx = process.argv.indexOf('--');

if (!mode || (mode !== 'development' && mode !== 'production') || sepIdx === -1) {
  console.error('Usage: bun scripts/with-env.ts <development|production> -- <command...>');
  process.exit(1);
}

const cmd = process.argv.slice(sepIdx + 1);
if (cmd.length === 0) {
  console.error('Missing command after --');
  process.exit(1);
}

loadProfileEnv(mode);

const [bin, ...args] = cmd;
const result = spawnSync(bin!, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
