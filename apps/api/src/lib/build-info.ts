import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function readPackageVersion(): string {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export type RealtimeMode = 'single-instance' | 'redis';

export const buildInfo = {
  version: process.env.APP_VERSION ?? readPackageVersion(),
  gitSha: process.env.GIT_SHA ?? 'dev',
  realtimeMode: (process.env.REALTIME_MODE ?? 'single-instance') as RealtimeMode,
};
