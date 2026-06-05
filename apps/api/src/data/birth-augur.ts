/** Birth augur (lucky sign) entries — DCC funnel d30 table (subset with standard bonuses). */
export const BIRTH_AUGURS = [
  { roll: 1, name: 'Raven', bonus: 'Melee & missile attack rolls' },
  { roll: 2, name: 'Serpent', bonus: 'Initiative' },
  { roll: 3, name: 'Warrior\'s arm', bonus: 'Critical hit tables' },
  { roll: 4, name: 'Gambler\'s arm', bonus: 'Crit & fumble tables' },
  { roll: 5, name: 'Scholar', bonus: 'Spell checks' },
  { roll: 6, name: 'Merchant', bonus: 'Appraisal' },
  { roll: 7, name: 'Noble', bonus: 'Personality' },
  { roll: 8, name: 'Chained maiden', bonus: 'Willpower saves' },
  { roll: 9, name: 'Stargazer', bonus: 'Intelligence' },
  { roll: 10, name: 'Moon', bonus: 'Magic shield' },
  { roll: 11, name: 'Bull', bonus: 'Strength' },
  { roll: 12, name: 'Tree', bonus: 'Stamina' },
  { roll: 13, name: 'Hamsa', bonus: 'AC' },
  { roll: 14, name: 'Dancing star', bonus: 'Reflex saves' },
  { roll: 15, name: 'Rabbit\'s foot', bonus: 'Fortitude saves' },
  { roll: 16, name: 'Four-leaf clover', bonus: 'Luck' },
  { roll: 17, name: 'Cauldron', bonus: 'Hit points' },
  { roll: 18, name: 'Salamander', bonus: 'Melee damage' },
  { roll: 19, name: 'Donkey', bonus: 'Missile fire damage' },
  { roll: 20, name: 'Rose', bonus: 'Melee & missile damage' },
] as const;

export function rollBirthAugur(
  rollD30: (min: number, max: number) => number,
): (typeof BIRTH_AUGURS)[number] {
  const roll = rollD30(1, 20);
  return BIRTH_AUGURS.find((a) => a.roll === roll) ?? BIRTH_AUGURS[0];
}

/** DCC: augur modifier = birth augur roll − Luck score (applied to the listed bonus). */
export function augurModifier(augurRoll: number, luckScore: number): number {
  return augurRoll - luckScore;
}
