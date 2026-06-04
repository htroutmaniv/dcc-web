import type { CharacterCombat, CharacterStats } from '@dcc-web/shared';
import { secureRandomInt } from '../lib/rng.js';

const OCCUPATIONS = [
  'Woodcutter',
  'Dwarf',
  'Elven falconer',
  'Merchant',
  'Acolyte',
  'Farmer',
  'Urchin',
];

const ALIGNMENTS = ['Law', 'Neutral', 'Chaos', ''];

const LUCKY_SIGNS = [
  'Warrior\'s arm (Critical hit tables)',
  'Hamsa (Bonus to AC)',
  'Rabbit\'s foot (Bonus to saves)',
];

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

export interface GeneratedItem {
  category: 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable';
  name: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
}

/** 0-level funnel-style generator; leveled classes expand later. */
export function generateRandomCharacterData(level: number): {
  name: string;
  className: string;
  level: number;
  alignment: string;
  notes: string;
  stats: CharacterStats;
  combat: CharacterCombat;
  items: GeneratedItem[];
} {
  const abilities = ['str', 'agi', 'sta', 'per', 'int', 'lck'] as const;
  const abilityRecord: CharacterStats['abilities'] = {};
  for (const key of abilities) {
    abilityRecord[key] = rollAbility();
  }

  const occupation = OCCUPATIONS[secureRandomInt(0, OCCUPATIONS.length - 1)]!;
  const alignment = ALIGNMENTS[secureRandomInt(0, ALIGNMENTS.length - 1)]!;
  const luckySign = LUCKY_SIGNS[secureRandomInt(0, LUCKY_SIGNS.length - 1)]!;

  const staMod = abilityRecord.sta.modifier;
  const agiMod = abilityRecord.agi.modifier;
  const hpMax = Math.max(1, secureRandomInt(1, 6) + staMod);

  const items: GeneratedItem[] = [
    {
      category: 'weapon',
      name: 'Handaxe',
      quantity: 1,
      properties: { damage: '1d6', attackBonus: 0 },
    },
    { category: 'misc', name: 'Bundle of wood', quantity: 1 },
    { category: 'misc', name: 'Grappling hook', quantity: 1, notes: '1 gp' },
  ];

  return {
    name: `Funnel ${secureRandomInt(100, 999)}`,
    className: level > 0 ? 'Warrior' : occupation,
    level,
    alignment,
    notes: '',
    stats: {
      abilities: abilityRecord,
      speed: 30,
      armorSpeedPenalty: 0,
      movementModifiers: [],
      initiative: agiMod,
      saves: {
        ref: agiMod,
        frt: staMod,
        wil: abilityRecord.per.modifier,
      },
      custom: {
        occupation,
        startingFunds: `${secureRandomInt(1, 6) * 5} cp`,
        luckySign: `${luckySign} (+0)`,
        languages: 'Common',
      },
    },
    combat: {
      ac: 10 + agiMod,
      hpMax,
      hpCurrent: hpMax,
    },
    items,
  };
}
