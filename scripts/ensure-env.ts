import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const env = resolve(root, '.env');
const example = resolve(root, '.env.example');

if (!existsSync(env)) {
  if (!existsSync(example)) {
    console.error('Missing .env.example — cannot bootstrap .env');
    process.exit(1);
  }
  copyFileSync(example, env);
  console.log('Created .env from .env.example');
}
