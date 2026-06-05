import type { FunnelRace } from './funnel-occupation-types.js';
import { parseTrainedWeapon } from './occupation-weapons.js';

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

export function parseRollRange(roll: string): { rollLow: number; rollHigh: number } {
  const cleaned = roll.trim();
  if (cleaned.includes('-')) {
    const [low, high] = cleaned.split('-').map((part) => Number.parseInt(part.trim(), 10));
    if (Number.isNaN(low) || Number.isNaN(high)) {
      throw new Error(`Invalid occupation roll range: ${roll}`);
    }
    return { rollLow: low, rollHigh: high };
  }
  const value = Number.parseInt(cleaned, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid occupation roll: ${roll}`);
  }
  return { rollLow: value, rollHigh: value };
}

export function raceFromOccupationName(name: string): FunnelRace | undefined {
  if (name.startsWith('Dwarven ')) return 'dwarf';
  if (name.startsWith('Elven ')) return 'elf';
  if (name.startsWith('Halfling ')) return 'halfling';
  return undefined;
}

export interface ParsedOccupationSeedRow {
  rollLow: number;
  rollHigh: number;
  name: string;
  race?: FunnelRace;
  trainedWeapon: string;
  weaponDamage: string;
  tradeGoods: string;
}

export function parseOccupationSeedRow(row: {
  roll: string;
  name: string;
  trainedWeapon: string;
  tradeGoods: string;
}): ParsedOccupationSeedRow {
  const { rollLow, rollHigh } = parseRollRange(row.roll);
  const weapon = parseTrainedWeapon(row.trainedWeapon);
  return {
    rollLow,
    rollHigh,
    name: row.name,
    race: raceFromOccupationName(row.name),
    trainedWeapon: weapon.name,
    weaponDamage: weapon.damage,
    tradeGoods: row.tradeGoods,
  };
}

export function validateOccupationTable(
  occupations: { rollLow: number; rollHigh: number; name: string }[],
): void {
  const covered = new Set<number>();
  for (const row of occupations) {
    if (row.rollLow > row.rollHigh) {
      throw new Error(`Occupation "${row.name}" has inverted roll range`);
    }
    for (let roll = row.rollLow; roll <= row.rollHigh; roll++) {
      if (covered.has(roll)) {
        throw new Error(`Occupation table covers d100 roll ${roll} more than once`);
      }
      covered.add(roll);
    }
  }
  for (let roll = 1; roll <= 100; roll++) {
    if (!covered.has(roll)) {
      throw new Error(`Occupation table missing d100 roll ${roll}`);
    }
  }
}
