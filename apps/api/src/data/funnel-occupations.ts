import type { CharacterRace } from '@dcc-web/shared';
import { getOccupations } from '../services/occupation-service.js';

export type { FunnelOccupation, FunnelRace } from './funnel-occupation-types.js';
import type { FunnelOccupation } from './funnel-occupation-types.js';

export function occupationForRoll(roll: number): FunnelOccupation | undefined {
  return getOccupations().find((o) => roll >= o.rollLow && roll <= o.rollHigh);
}

export interface FunnelOccupationRollFilters {
  noElves?: boolean;
  noDwarves?: boolean;
  noHalflings?: boolean;
  /** When set, racial occupations for other races are re-rolled. */
  characterRace?: CharacterRace;
}

function occupationRequiresReroll(
  occupation: FunnelOccupation,
  filters: FunnelOccupationRollFilters,
): boolean {
  if (filters.noElves && occupation.race === 'elf') return true;
  if (filters.noDwarves && occupation.race === 'dwarf') return true;
  if (filters.noHalflings && occupation.race === 'halfling') return true;

  if (filters.characterRace && occupation.race && occupation.race !== filters.characterRace) {
    return true;
  }

  return false;
}

/** Roll d100 on the full table; re-roll racial results that do not apply. */
export function rollFunnelOccupation(
  filters: FunnelOccupationRollFilters,
  rollD100: (min: number, max: number) => number,
): FunnelOccupation {
  const table = getOccupations();
  for (let attempt = 0; attempt < 50; attempt++) {
    const roll = rollD100(1, 100);
    const match = occupationForRoll(roll);
    if (!match) continue;
    if (occupationRequiresReroll(match, filters)) continue;
    return match;
  }

  const fallbackPool = table.filter((o) => !occupationRequiresReroll(o, filters));
  if (fallbackPool.length === 0) {
    throw new Error('No occupations available with the current race filters');
  }
  return fallbackPool[rollD100(0, fallbackPool.length - 1)]!;
}
