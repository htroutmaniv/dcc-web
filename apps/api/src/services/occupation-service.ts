import type { Occupation, OccupationRace } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { FunnelOccupation, FunnelRace } from '../data/funnel-occupation-types.js';
import { validateOccupationTable } from '../data/occupation-parse.js';

let cachedOccupations: FunnelOccupation[] | null = null;

function mapRace(race: OccupationRace | null): FunnelRace | undefined {
  if (race === 'elf' || race === 'dwarf' || race === 'halfling') return race;
  return undefined;
}

function mapRow(row: Occupation): FunnelOccupation {
  return {
    rollLow: row.rollLow,
    rollHigh: row.rollHigh,
    name: row.name,
    race: mapRace(row.race),
    weapon: {
      name: row.trainedWeapon,
      damage: row.weaponDamage,
      attackBonus: row.weaponAttackBonus,
    },
    goods: [{ name: row.tradeGoods }],
  };
}

export async function loadOccupationsFromDb(): Promise<FunnelOccupation[]> {
  const rows = await prisma.occupation.findMany({
    orderBy: [{ rollLow: 'asc' }, { rollHigh: 'asc' }],
  });
  if (rows.length === 0) {
    throw new Error(
      'Occupations table is empty. Run: bun run db:seed (from repo root) or apps/api.',
    );
  }
  const occupations = rows.map(mapRow);
  validateOccupationTable(occupations);
  cachedOccupations = occupations;
  return occupations;
}

export async function ensureOccupationsLoaded(): Promise<void> {
  if (!cachedOccupations) {
    await loadOccupationsFromDb();
  }
}

export function getOccupations(): FunnelOccupation[] {
  if (!cachedOccupations) {
    throw new Error('Occupations not loaded — server startup must call ensureOccupationsLoaded()');
  }
  return cachedOccupations;
}

export function clearOccupationCache(): void {
  cachedOccupations = null;
}
