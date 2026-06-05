import {
  classMatchesRaceFilter,
  computeDccSaves,
  consumablePropertiesToRecord,
  CONSUMABLE_PRESETS_BY_NAME,
  DCC_CHARACTER_CLASSES,
  DCC_CLASS_HIT_DIE,
  savesToStored,
  type DccCharacterClass,
} from '@dcc-web/shared';
import type { CharacterCombat, CharacterStats } from '@dcc-web/shared';
import { luckyRollModifier, rollBirthAugur } from '../data/birth-augur.js';
import { rollFunnelOccupation } from '../data/funnel-occupations.js';
import { secureRandomInt } from '../lib/rng.js';

const ALIGNMENTS = ['Lawful', 'Neutral', 'Chaotic', 'Unaligned'] as const;

const ABILITY_KEYS = ['str', 'agi', 'sta', 'per', 'int', 'lck'] as const;

function roll3d6(): number {
  return secureRandomInt(1, 6) + secureRandomInt(1, 6) + secureRandomInt(1, 6);
}

function abilityModifier(score: number): number {
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 7) return -1;
  if (score <= 13) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3;
}

function rollAbility(): { score: number; modifier: number } {
  const score = roll3d6();
  return { score, modifier: abilityModifier(score) };
}

function roll3d6Copper(): number {
  return roll3d6() + roll3d6() + roll3d6();
}

export interface GeneratedItem {
  category: 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable';
  name: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
}

export interface RandomCharacterOptions {
  level: number;
  className?: string;
  noElves?: boolean;
  noDwarves?: boolean;
  noHalflings?: boolean;
}

export interface ManualCharacterOptions {
  level: number;
  className?: string;
  name?: string;
}

function buildAbilityRecord(
  roller: () => { score: number; modifier: number } = rollAbility,
): CharacterStats['abilities'] {
  const abilityRecord: CharacterStats['abilities'] = {};
  for (const key of ABILITY_KEYS) {
    abilityRecord[key] = roller();
  }
  return abilityRecord;
}

function statsFromAbilities(
  abilityRecord: CharacterStats['abilities'],
  custom: Record<string, unknown>,
  level: number,
  className: string,
): CharacterStats {
  const agiMod = abilityRecord.agi?.modifier ?? 0;
  const staMod = abilityRecord.sta?.modifier ?? 0;
  const perMod = abilityRecord.per?.modifier ?? 0;
  const saves = computeDccSaves({
    level,
    className: level > 0 ? className : undefined,
    agilityMod: agiMod,
    staminaMod: staMod,
    personalityMod: perMod,
  });
  return {
    abilities: abilityRecord,
    speed: 30,
    armorSpeedPenalty: 0,
    movementModifiers: [],
    initiative: agiMod,
    saves: savesToStored(saves),
    custom: { ...custom, baseSpeed: (custom.baseSpeed as number | undefined) ?? 30 },
  };
}

function pickLeveledClass(options: RandomCharacterOptions): string {
  const filters = {
    noElves: options.noElves,
    noDwarves: options.noDwarves,
    noHalflings: options.noHalflings,
  };
  if (options.className?.trim()) {
    const name = options.className.trim();
    if (!classMatchesRaceFilter(name, filters)) {
      throw new Error(`Class "${name}" is excluded by race filters`);
    }
    return name;
  }
  const pool = DCC_CHARACTER_CLASSES.filter((c) => classMatchesRaceFilter(c, filters));
  if (pool.length === 0) {
    throw new Error('No classes available with the current race filters');
  }
  return pool[secureRandomInt(0, pool.length - 1)]!;
}

function rollClassHp(className: string, staMod: number): number {
  const die =
    DCC_CLASS_HIT_DIE[className as DccCharacterClass] ??
    DCC_CLASS_HIT_DIE.Warrior;
  return Math.max(1, secureRandomInt(1, die) + staMod);
}

function occupationToItems(occupation: ReturnType<typeof rollFunnelOccupation>): GeneratedItem[] {
  const items: GeneratedItem[] = [
    {
      category: 'weapon',
      name: occupation.weapon.name,
      quantity: 1,
      properties: {
        damage: occupation.weapon.damage,
        attackBonus: occupation.weapon.attackBonus ?? 0,
      },
    },
  ];
  for (const g of occupation.goods) {
    const preset =
      CONSUMABLE_PRESETS_BY_NAME[g.name.trim().toLowerCase()];
    if (preset) {
      items.push({
        category: 'disposable',
        name: g.name,
        quantity: 1,
        notes: g.notes ?? '',
        properties: consumablePropertiesToRecord({ ...preset }),
      });
      continue;
    }
    items.push({
      category: 'misc',
      name: g.name,
      quantity: 1,
      notes: g.notes,
    });
  }
  return items;
}

/** Random character — server-side DCC-style rollers (see docs/CHARACTER-GENERATION.md). */
export function generateRandomCharacterData(options: RandomCharacterOptions): {
  name: string;
  className: string;
  level: number;
  alignment: string;
  notes: string;
  stats: CharacterStats;
  combat: CharacterCombat;
  items: GeneratedItem[];
} {
  const level = options.level;
  const abilityRecord = buildAbilityRecord();
  const staMod = abilityRecord.sta!.modifier;
  const agiMod = abilityRecord.agi!.modifier;
  const lckMod = abilityRecord.lck!.modifier;

  const { augur } = rollBirthAugur(
    (min, max) => secureRandomInt(min, max),
    lckMod,
  );
  const augurMod = luckyRollModifier(lckMod);

  const alignment = ALIGNMENTS[secureRandomInt(0, ALIGNMENTS.length - 1)]!;

  if (level === 0) {
    const occupation = rollFunnelOccupation(
      {
        noElves: options.noElves,
        noDwarves: options.noDwarves,
        noHalflings: options.noHalflings,
      },
      (min, max) => secureRandomInt(min, max),
    );
    const hpMax = Math.max(1, secureRandomInt(1, 6) + staMod);

    return {
      name: `Funnel ${secureRandomInt(100, 999)}`,
      className: occupation.name,
      level: 0,
      alignment,
      notes: '',
      stats: statsFromAbilities(
        abilityRecord,
        {
          occupation: occupation.name,
          race: occupation.race ?? 'human',
          startingFunds: `${roll3d6Copper()} cp`,
          luckySign: `${augur.name} (${augur.bonus}, ${augurMod >= 0 ? '+' : ''}${augurMod})`,
          languages: 'Common',
        },
        0,
        '',
      ),
      combat: {
        ac: 10 + agiMod,
        hpMax,
        hpCurrent: hpMax,
      },
      items: occupationToItems(occupation),
    };
  }

  const className = pickLeveledClass(options);
  const hpMax = rollClassHp(className, staMod);

  return {
    name: `${className} ${secureRandomInt(100, 999)}`,
    className,
    level,
    alignment,
    notes: '',
    stats: statsFromAbilities(
      abilityRecord,
      {
        luckySign: `${augur.name} (${augur.bonus}, ${augurMod >= 0 ? '+' : ''}${augurMod})`,
        languages: 'Common',
        startingFunds: `${roll3d6Copper()} cp`,
      },
      level,
      className,
    ),
    combat: {
      ac: 10 + agiMod,
      hpMax,
      hpCurrent: hpMax,
    },
    items: [
      {
        category: 'weapon',
        name: 'Unarmed strike',
        quantity: 1,
        properties: { damage: '1d3', attackBonus: 0 },
      },
    ],
  };
}

/** Blank manual character — player/DM fills the sheet in the app. */
export function createManualCharacterData(options: ManualCharacterOptions): {
  name: string;
  className: string;
  level: number;
  alignment: string;
  notes: string;
  stats: CharacterStats;
  combat: CharacterCombat;
  items: GeneratedItem[];
} {
  const level = options.level;
  const abilityRecord = buildAbilityRecord(() => ({
    score: 10,
    modifier: 0,
  }));

  const className =
    level > 0
      ? (options.className?.trim() || 'Warrior')
      : (options.className?.trim() || '');

  const hpMax = level > 0 ? rollClassHp(className || 'Warrior', 0) : 1;

  return {
    name: options.name?.trim() || 'New Character',
    className: level === 0 ? '' : className,
    level,
    alignment: '',
    notes: '',
    stats: statsFromAbilities(
      abilityRecord,
      {
        occupation: level === 0 ? '' : undefined,
        race: 'human',
        languages: 'Common',
      },
      level,
      className || 'Warrior',
    ),
    combat: {
      ac: 10,
      hpMax,
      hpCurrent: hpMax,
    },
    items: [],
  };
}
