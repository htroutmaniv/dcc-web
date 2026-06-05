/** Official DCC birth augur (lucky sign) table — 1d30, adjusted by Luck modifier at creation. */
export interface BirthAugur {
  roll: number;
  name: string;
  appliesTo: string;
  /** Luck modifier is doubled when applied to this augur's roll type. */
  doubleLuck?: boolean;
}

export const BIRTH_AUGURS: readonly BirthAugur[] = [
  { roll: 1, name: 'Harsh winter', appliesTo: 'All attack rolls' },
  { roll: 2, name: 'The bull', appliesTo: 'Melee attack rolls' },
  { roll: 3, name: 'Fortunate date', appliesTo: 'Missile attack rolls' },
  { roll: 4, name: 'Raised by wolves', appliesTo: 'Unarmed attack rolls' },
  { roll: 5, name: 'Conceived on horseback', appliesTo: 'Mounted attack rolls' },
  { roll: 6, name: 'Born on the battlefield', appliesTo: 'Damage rolls' },
  { roll: 7, name: 'Path of the bear', appliesTo: 'Melee damage rolls' },
  { roll: 8, name: 'Hawkeye', appliesTo: 'Missile damage rolls' },
  {
    roll: 9,
    name: 'Pack hunter',
    appliesTo: 'Attack and damage with starting weapon',
  },
  {
    roll: 10,
    name: 'Born under the loom',
    appliesTo: 'Skill checks (including thief skills)',
  },
  { roll: 11, name: "Fox's cunning", appliesTo: 'Find/disable traps' },
  { roll: 12, name: 'Four-leafed clover', appliesTo: 'Find secret doors' },
  { roll: 13, name: 'Seventh son', appliesTo: 'Spell checks' },
  { roll: 14, name: 'The raging storm', appliesTo: 'Spell damage' },
  { roll: 15, name: 'Righteous heart', appliesTo: 'Turn unholy checks' },
  { roll: 16, name: 'Survived the plague', appliesTo: 'Magical healing' },
  { roll: 17, name: 'Lucky sign', appliesTo: 'Saving throws' },
  { roll: 18, name: 'Guardian angel', appliesTo: 'Saves vs traps' },
  { roll: 19, name: 'Survived a spider bite', appliesTo: 'Saves vs poison' },
  { roll: 20, name: 'Struck by lightning', appliesTo: 'Reflex saves' },
  { roll: 21, name: 'Lived through famine', appliesTo: 'Fortitude saves' },
  { roll: 22, name: 'Resisted temptation', appliesTo: 'Will saves' },
  { roll: 23, name: 'Charmed house', appliesTo: 'Armor Class' },
  { roll: 24, name: 'Speed of the cobra', appliesTo: 'Initiative' },
  { roll: 25, name: 'Bountiful harvest', appliesTo: 'Hit points gained per level' },
  {
    roll: 26,
    name: "Warrior's arm",
    appliesTo: 'Critical hit rolls',
    doubleLuck: true,
  },
  { roll: 27, name: 'Unholy house', appliesTo: 'Corruption rolls' },
  {
    roll: 28,
    name: 'The Broken Star',
    appliesTo: 'Fumbles',
    doubleLuck: true,
  },
  { roll: 29, name: 'Birdsong', appliesTo: 'Number of languages' },
  {
    roll: 30,
    name: 'Wild child',
    appliesTo: 'Movement speed (+/- 5 ft per modifier)',
  },
] as const;

export const BIRTH_AUGUR_ROLL_MAX = 30;

export function clampAugurRoll(roll: number): number {
  return Math.min(BIRTH_AUGUR_ROLL_MAX, Math.max(1, roll));
}

export function augurForRoll(roll: number): BirthAugur {
  const clamped = clampAugurRoll(roll);
  return BIRTH_AUGURS.find((a) => a.roll === clamped) ?? BIRTH_AUGURS[0]!;
}

/**
 * Roll birth augur: 1d30 adjusted by Luck modifier, clamped to 1–30.
 */
export function rollBirthAugur(
  rollDie: (min: number, max: number) => number,
  luckModifier: number,
): { augur: BirthAugur; dieRoll: number; adjustedRoll: number } {
  const dieRoll = rollDie(1, BIRTH_AUGUR_ROLL_MAX);
  const adjustedRoll = clampAugurRoll(dieRoll + luckModifier);
  return { augur: augurForRoll(adjustedRoll), dieRoll, adjustedRoll };
}

/**
 * Permanent lucky-roll modifier at creation: the character's Luck ability modifier.
 * Doubled for augurs marked `doubleLuck` when that roll type is resolved.
 */
export function luckyRollModifier(
  luckModifier: number,
  augur?: Pick<BirthAugur, 'doubleLuck'>,
): number {
  if (augur?.doubleLuck) return luckModifier * 2;
  return luckModifier;
}

/** Display string stored on the character sheet (stats.custom.luckySign). */
export function formatLuckySign(augur: BirthAugur, luckModifier: number): string {
  const mod = luckyRollModifier(luckModifier, augur);
  const modLabel = `${mod >= 0 ? '+' : ''}${mod}`;
  return `${augur.name} (${augur.appliesTo}, ${modLabel})`;
}
