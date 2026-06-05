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

const AUGUR_ROLL_MAX = 20;

export function clampAugurRoll(roll: number): number {
  return Math.min(AUGUR_ROLL_MAX, Math.max(1, roll));
}

export function augurForRoll(roll: number): (typeof BIRTH_AUGURS)[number] {
  const clamped = clampAugurRoll(roll);
  return BIRTH_AUGURS.find((a) => a.roll === clamped) ?? BIRTH_AUGURS[0];
}

/**
 * Roll birth augur: 1d20 on the subset table, adjusted by Luck modifier (DCC Table 1-2).
 */
export function rollBirthAugur(
  rollDie: (min: number, max: number) => number,
  luckModifier: number,
): { augur: (typeof BIRTH_AUGURS)[number]; dieRoll: number; adjustedRoll: number } {
  const dieRoll = rollDie(1, AUGUR_ROLL_MAX);
  const adjustedRoll = clampAugurRoll(dieRoll + luckModifier);
  return { augur: augurForRoll(adjustedRoll), dieRoll, adjustedRoll };
}

/**
 * Permanent "lucky roll" modifier for the augur's bonus (DCC core p.19):
 * the character's Luck ability modifier at creation — not augur die − Luck score.
 */
export function luckyRollModifier(luckModifier: number): number {
  return luckModifier;
}
