import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

export type EnvProfile = 'development' | 'production';

export function resolveEnvProfile(mode?: string): EnvProfile {
  const raw = mode ?? process.env.DCC_ENV ?? 'development';
  if (raw === 'production') return 'production';
  return 'development';
}

/** Load `.env` (secrets) then `.env.<profile>` (and optional `.env.<profile>.local`). */
export function loadProfileEnv(mode?: string): EnvProfile {
  const profile = resolveEnvProfile(mode);

  const load = (file: string, override: boolean) => {
    const path = resolve(root, file);
    if (existsSync(path)) config({ path, override });
  };

  load('.env', false);
  load(`.env.${profile}`, true);
  load(`.env.${profile}.local`, true);

  process.env.DCC_ENV = profile;
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = profile === 'production' ? 'production' : 'development';
  }

  return profile;
}
