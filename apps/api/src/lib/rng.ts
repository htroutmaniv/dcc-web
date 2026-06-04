import { randomInt } from 'node:crypto';

export function secureRandomInt(min: number, max: number): number {
  return randomInt(min, max + 1);
}
