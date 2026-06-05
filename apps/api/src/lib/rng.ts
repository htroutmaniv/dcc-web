import { randomInt } from 'node:crypto';

export function secureRandomInt(min: number, max: number): number {
  const lo = Math.floor(Number(min));
  const hi = Math.floor(Number(max));
  if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi)) {
    throw new Error(`Invalid random range: ${min}..${max}`);
  }
  if (hi < lo) {
    return lo;
  }
  return randomInt(lo, hi + 1);
}
