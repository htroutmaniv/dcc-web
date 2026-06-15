import type { ConsumableProperties } from './consumable-types.js';

export function normalizeItemName(name: string): string {
  return name.trim().toLowerCase();
}

export const CONSUMABLE_PRESETS_BY_NAME: Record<string, ConsumableProperties> = {
  lantern: { light: true, requiresFuel: true, lightRadiusFt: 30 },
  'oil flask': { fuel: true, uses: 2 },
  waterskin: { vessel: true, capacity: 3, usesRemaining: 3, unitLabel: 'day' },
  torch: { light: true, consumedWhenEmpty: true, lightRadiusFt: 30 },
  'rations (1 day)': { food: true },
  'holy water': { vessel: true, capacity: 1, usesRemaining: 1, unitLabel: 'use' },
};
