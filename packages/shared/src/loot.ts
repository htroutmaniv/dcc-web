import type { LootPoolEntry } from './monster-sheet.js';

export function rollLootFromPool(
  entries: LootPoolEntry[],
  rollFn: (max: number) => number,
): LootPoolEntry[] {
  const loot: LootPoolEntry[] = [];
  const valid = entries.filter((e) => e.name.toLowerCase() !== 'nothing' && e.weight > 0);
  if (valid.length === 0) return loot;

  const total = valid.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  if (!Number.isFinite(total) || total < 1) return loot;
  let r = rollFn(total);
  for (const e of valid) {
    if (r <= e.weight) {
      if (e.name.toLowerCase() !== 'nothing') loot.push(e);
      break;
    }
    r -= e.weight;
  }
  return loot;
}
