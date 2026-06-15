/** Playable races for funnel (0-level) and leveled DCC characters. */
export const CHARACTER_RACES = ['human', 'elf', 'dwarf', 'halfling'] as const;

export type CharacterRace = (typeof CHARACTER_RACES)[number];

export function normalizeCharacterRace(value: unknown): CharacterRace {
  if (value === 'elf' || value === 'dwarf' || value === 'halfling') return value;
  return 'human';
}

export function raceLabel(race: CharacterRace): string {
  switch (race) {
    case 'elf':
      return 'Elf';
    case 'dwarf':
      return 'Dwarf';
    case 'halfling':
      return 'Halfling';
    default:
      return 'Human';
  }
}

/** Read race from stats.custom (`race` or legacy `occupationRace`). */
export function resolveCharacterRace(
  custom: Record<string, unknown> | undefined,
): CharacterRace {
  if (!custom) return 'human';
  if (custom.race != null) return normalizeCharacterRace(custom.race);
  if (custom.occupationRace != null) {
    return normalizeCharacterRace(custom.occupationRace);
  }
  return 'human';
}
