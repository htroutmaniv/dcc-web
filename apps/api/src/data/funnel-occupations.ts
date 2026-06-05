export type FunnelRace = 'elf' | 'dwarf' | 'halfling';

export interface FunnelOccupation {
  /** Inclusive d100 range on the funnel occupation table (core rulebook). */
  rollLow: number;
  rollHigh: number;
  name: string;
  race?: FunnelRace;
  weapon: { name: string; damage: string; attackBonus?: number };
  goods: { name: string; notes?: string }[];
}

/**
 * Subset of the DCC RPG funnel occupation table (0-level), with d100 ranges.
 * Used when rolling a random 0-level character; race tags drive elf/dwarf/halfling filters.
 */
export const FUNNEL_OCCUPATIONS: FunnelOccupation[] = [
  { rollLow: 1, rollHigh: 2, name: 'Alchemist', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Alchemist fire (1d6)' }] },
  { rollLow: 3, rollHigh: 4, name: 'Animal trainer', weapon: { name: 'Club', damage: '1d4' }, goods: [{ name: 'Pony' }] },
  { rollLow: 5, rollHigh: 6, name: 'Armorer', weapon: { name: 'Hammer', damage: '1d4' }, goods: [{ name: 'Steel scraps' }] },
  { rollLow: 7, rollHigh: 8, name: 'Astrologer', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Astrology charts' }] },
  { rollLow: 9, rollHigh: 10, name: 'Baker', weapon: { name: 'Rolling pin', damage: '1d4' }, goods: [{ name: 'Flour bag' }] },
  { rollLow: 11, rollHigh: 12, name: 'Barber', weapon: { name: 'Razor', damage: '1d4' }, goods: [{ name: 'Whetstone' }] },
  { rollLow: 13, rollHigh: 14, name: 'Beadle', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Holy book' }] },
  { rollLow: 15, rollHigh: 16, name: 'Beekeeper', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Honey' }] },
  { rollLow: 17, rollHigh: 18, name: 'Blacksmith', weapon: { name: 'Hammer', damage: '1d4' }, goods: [{ name: 'Steel tongs' }] },
  { rollLow: 19, rollHigh: 20, name: 'Butcher', weapon: { name: 'Cleaver', damage: '1d6' }, goods: [{ name: 'Salted meat' }] },
  { rollLow: 21, rollHigh: 22, name: 'Carpenter', weapon: { name: 'Hammer', damage: '1d4' }, goods: [{ name: 'Wood scraps' }] },
  { rollLow: 23, rollHigh: 24, name: 'Cartographer', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Maps' }] },
  { rollLow: 25, rollHigh: 26, name: 'Cheesemaker', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Cheese wheel' }] },
  { rollLow: 27, rollHigh: 28, name: 'Chicken butcher', weapon: { name: 'Cleaver', damage: '1d6' }, goods: [{ name: 'Cage' }] },
  { rollLow: 29, rollHigh: 30, name: 'Cooper', weapon: { name: 'Hammer', damage: '1d4' }, goods: [{ name: 'Barrel' }] },
  { rollLow: 31, rollHigh: 32, name: 'Dwarf', race: 'dwarf', weapon: { name: 'Hammer', damage: '1d4' }, goods: [{ name: 'Gold nugget' }] },
  { rollLow: 33, rollHigh: 34, name: 'Elven falconer', race: 'elf', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Falcon' }] },
  { rollLow: 35, rollHigh: 36, name: 'Farmer', weapon: { name: 'Pitchfork', damage: '1d8' }, goods: [{ name: 'Sow' }] },
  { rollLow: 37, rollHigh: 38, name: 'Fisherman', weapon: { name: 'Net', damage: '1d4' }, goods: [{ name: 'Tackle box' }] },
  { rollLow: 39, rollHigh: 40, name: 'Gambler', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Loaded dice' }] },
  { rollLow: 41, rollHigh: 42, name: 'Gravedigger', weapon: { name: 'Shovel', damage: '1d4' }, goods: [{ name: 'Tombstone' }] },
  { rollLow: 43, rollHigh: 44, name: 'Halfling trader', race: 'halfling', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Trade goods (5 gp value)' }] },
  { rollLow: 45, rollHigh: 46, name: 'Hunter', weapon: { name: 'Shortbow', damage: '1d6' }, goods: [{ name: 'Deer hide' }] },
  { rollLow: 47, rollHigh: 48, name: 'Indentured servant', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Debt papers' }] },
  { rollLow: 49, rollHigh: 50, name: 'Jeweler', weapon: { name: 'Hammer', damage: '1d4' }, goods: [{ name: 'Gem (20 gp value)' }] },
  { rollLow: 51, rollHigh: 52, name: 'Mendicant', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Begging bowl' }] },
  { rollLow: 53, rollHigh: 54, name: 'Merchant', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Trade goods (20 gp value)' }] },
  { rollLow: 55, rollHigh: 56, name: 'Miller', weapon: { name: 'Flail', damage: '1d6' }, goods: [{ name: 'Flour bag' }] },
  {
    rollLow: 57,
    rollHigh: 58,
    name: 'Miner',
    weapon: { name: 'Pick', damage: '1d6' },
    goods: [{ name: 'Lantern' }, { name: 'Oil flask' }],
  },
  { rollLow: 59, rollHigh: 60, name: 'Noble', weapon: { name: 'Sword', damage: '1d8' }, goods: [{ name: 'Silk clothes' }] },
  { rollLow: 61, rollHigh: 62, name: 'Orphan', weapon: { name: 'Shiv', damage: '1d3' }, goods: [{ name: 'Locket' }] },
  { rollLow: 63, rollHigh: 64, name: 'Poultry butcher', weapon: { name: 'Cleaver', damage: '1d6' }, goods: [{ name: 'Chicken' }] },
  { rollLow: 65, rollHigh: 66, name: 'Squire', weapon: { name: 'Sword', damage: '1d8' }, goods: [{ name: 'Shield' }] },
  { rollLow: 67, rollHigh: 68, name: 'Tavern worker', weapon: { name: 'Jug', damage: '1d4' }, goods: [{ name: 'Mug' }] },
  { rollLow: 69, rollHigh: 70, name: 'Tax collector', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Tax records' }] },
  { rollLow: 71, rollHigh: 72, name: 'Tinker', weapon: { name: 'Awl', damage: '1d4' }, goods: [{ name: 'Iron pot' }] },
  { rollLow: 73, rollHigh: 74, name: 'Urchin', weapon: { name: 'Shiv', damage: '1d3' }, goods: [{ name: 'Rag doll' }] },
  { rollLow: 75, rollHigh: 76, name: 'Wainwright', weapon: { name: 'Hammer', damage: '1d4' }, goods: [{ name: 'Wheel' }] },
  { rollLow: 77, rollHigh: 78, name: 'Woodcutter', weapon: { name: 'Handaxe', damage: '1d6' }, goods: [{ name: 'Bundle of wood' }] },
  { rollLow: 79, rollHigh: 80, name: 'Wrestler', weapon: { name: 'Unarmed', damage: '1d3' }, goods: [{ name: 'Trophy' }] },
  { rollLow: 81, rollHigh: 82, name: 'Acolyte', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Holy symbol' }] },
  { rollLow: 83, rollHigh: 84, name: 'Barrister', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Legal briefs' }] },
  { rollLow: 85, rollHigh: 86, name: 'Chandler', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Candles (10)' }] },
  { rollLow: 87, rollHigh: 88, name: 'Clerk', weapon: { name: 'Quill', damage: '1d3' }, goods: [{ name: 'Ledger' }] },
  { rollLow: 89, rollHigh: 90, name: 'Elven artisan', race: 'elf', weapon: { name: 'Longbow', damage: '1d6' }, goods: [{ name: 'Fine cloth' }] },
  { rollLow: 91, rollHigh: 92, name: 'Halfling gypsy', race: 'halfling', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Tarot deck' }] },
  { rollLow: 93, rollHigh: 94, name: 'Herbalist', weapon: { name: 'Staff', damage: '1d4+1' }, goods: [{ name: 'Herbs' }] },
  { rollLow: 95, rollHigh: 96, name: 'Mariner', weapon: { name: 'Short sword', damage: '1d6' }, goods: [{ name: 'Rope (50 ft)' }] },
  { rollLow: 97, rollHigh: 98, name: 'Scribe', weapon: { name: 'Quill', damage: '1d3' }, goods: [{ name: 'Ink & quills' }] },
  { rollLow: 99, rollHigh: 100, name: 'Witch', weapon: { name: 'Dagger', damage: '1d4' }, goods: [{ name: 'Herbs' }] },
];

export function filterOccupations(filters: {
  noElves?: boolean;
  noDwarves?: boolean;
  noHalflings?: boolean;
}): FunnelOccupation[] {
  return FUNNEL_OCCUPATIONS.filter((o) => {
    if (filters.noElves && o.race === 'elf') return false;
    if (filters.noDwarves && o.race === 'dwarf') return false;
    if (filters.noHalflings && o.race === 'halfling') return false;
    return true;
  });
}

/** Roll d100 and resolve an occupation from the filtered table (re-roll if range missing). */
export function rollFunnelOccupation(filters: {
  noElves?: boolean;
  noDwarves?: boolean;
  noHalflings?: boolean;
}, rollD100: (min: number, max: number) => number): FunnelOccupation {
  const pool = filterOccupations(filters);
  if (pool.length === 0) {
    throw new Error('No occupations available with the current race filters');
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const roll = rollD100(1, 100);
    const match = pool.find((o) => roll >= o.rollLow && roll <= o.rollHigh);
    if (match) return match;
  }
  return pool[rollD100(0, pool.length - 1)]!;
}
