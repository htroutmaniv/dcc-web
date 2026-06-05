/** Core DCC RPG classes (leveled play). Race-specific classes respect funnel exclusion flags. */
export const DCC_CHARACTER_CLASSES = [
  'Warrior',
  'Cleric',
  'Wizard',
  'Thief',
  'Dwarf',
  'Elf',
  'Halfling',
] as const;

export type DccCharacterClass = (typeof DCC_CHARACTER_CLASSES)[number];

export const DCC_CLASS_HIT_DIE: Record<DccCharacterClass, number> = {
  Warrior: 12,
  Cleric: 8,
  Wizard: 4,
  Thief: 6,
  Dwarf: 10,
  Elf: 6,
  Halfling: 6,
};

export function classMatchesRaceFilter(
  className: string,
  filters: { noElves?: boolean; noDwarves?: boolean; noHalflings?: boolean },
): boolean {
  if (filters.noElves && className === 'Elf') return false;
  if (filters.noDwarves && className === 'Dwarf') return false;
  if (filters.noHalflings && className === 'Halfling') return false;
  return true;
}
