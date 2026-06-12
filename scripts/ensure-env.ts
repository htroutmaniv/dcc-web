import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function ensureFromExample(target: string, example: string): void {
  const envPath = resolve(root, target);
  const examplePath = resolve(root, example);
  if (!existsSync(envPath) && existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    console.log(`Created ${target} from ${example}`);
  }
}

ensureFromExample('.env', '.env.example');
ensureFromExample('.env.development', '.env.development.example');
ensureFromExample('.env.production', '.env.production.example');
