import type { DccCharacterClass } from './dcc-classes.js';
import { DCC_CHARACTER_CLASSES } from './dcc-classes.js';

export interface DccSaves {
  reflex: number;
  fortitude: number;
  will: number;
}

/** Which saves are "good" for each class (DCC core classes). */
export const DCC_CLASS_SAVE_GOOD: Record<
  DccCharacterClass,
  { reflex: boolean; fortitude: boolean; will: boolean }
> = {
  Warrior: { reflex: false, fortitude: true, will: false },
  Cleric: { reflex: false, fortitude: true, will: true },
  Wizard: { reflex: false, fortitude: false, will: true },
  Thief: { reflex: true, fortitude: false, will: false },
  Dwarf: { reflex: false, fortitude: true, will: false },
  Elf: { reflex: true, fortitude: false, will: true },
  Halfling: { reflex: true, fortitude: false, will: false },
};

/** Racial/class flat bonus to Fortitude (Dwarf). */
export const DCC_CLASS_FORTITUDE_FLAT: Partial<Record<DccCharacterClass, number>> = {
  Dwarf: 2,
};

function isDccClass(name: string): name is DccCharacterClass {
  return (DCC_CHARACTER_CLASSES as readonly string[]).includes(name);
}

/**
 * Class-only save bonus before ability modifiers.
 * Level 0 (funnel): +0 on all saves.
 * Level 1+: good saves start at +1 and rise every 2 levels; poor saves every 3 levels (DCC core).
 */
export function classSaveBonus(isGood: boolean, level: number): number {
  if (level <= 0) return 0;
  if (isGood) return 1 + Math.floor((level - 1) / 2);
  return Math.floor((level - 1) / 3);
}

export function computeDccSaves(params: {
  level: number;
  /** Leveled class name; ignored at level 0 (funnel uses ability mods only). */
  className?: string;
  agilityMod: number;
  staminaMod: number;
  personalityMod: number;
}): DccSaves {
  const { level, agilityMod, staminaMod, personalityMod } = params;
  const className = params.className?.trim() ?? '';

  if (level <= 0) {
    return {
      reflex: agilityMod,
      fortitude: staminaMod,
      will: personalityMod,
    };
  }

  const dccClass = isDccClass(className) ? className : 'Warrior';
  const good = DCC_CLASS_SAVE_GOOD[dccClass];
  const fortFlat = DCC_CLASS_FORTITUDE_FLAT[dccClass] ?? 0;

  return {
    reflex: classSaveBonus(good.reflex, level) + agilityMod,
    fortitude: classSaveBonus(good.fortitude, level) + staminaMod + fortFlat,
    will: classSaveBonus(good.will, level) + personalityMod,
  };
}

/** Normalize DB save keys (ref/frt/wil or reflex/fortitude/will) to sheet shape. */
export function parseStoredSaves(
  saves: Record<string, number> | undefined,
): DccSaves | null {
  if (!saves) return null;
  const reflex = saves.ref ?? saves.reflex;
  const fortitude = saves.frt ?? saves.fortitude;
  const will = saves.wil ?? saves.will;
  if (reflex == null || fortitude == null || will == null) return null;
  return {
    reflex: Number(reflex),
    fortitude: Number(fortitude),
    will: Number(will),
  };
}

export function savesToStored(saves: DccSaves): { ref: number; frt: number; wil: number } {
  return { ref: saves.reflex, frt: saves.fortitude, wil: saves.will };
}

export function formatSaveModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
