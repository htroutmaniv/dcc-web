import type { CharacterCombat, CharacterStats } from '@dcc-web/shared';
import { secureRandomInt } from '../lib/rng.js';

const CLASSES = ['Warrior', 'Thief', 'Cleric', 'Wizard', 'Dwarf', 'Elf', 'Halfling'];

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

/** Minimal server-side 0-level-style generator for skeleton; expand later. */
export function generateRandomCharacterData(level: number): {
  name: string;
  className: string;
  level: number;
  stats: CharacterStats;
  combat: CharacterCombat;
} {
  const abilities = ['str', 'agi', 'sta', 'per', 'int', 'lck'] as const;
  const abilityRecord: CharacterStats['abilities'] = {};
  for (const key of abilities) {
    abilityRecord[key] = rollAbility();
  }
  const staMod = abilityRecord.sta.modifier;
  const hpMax = Math.max(1, secureRandomInt(1, 6) + staMod);
  const className = CLASSES[secureRandomInt(0, CLASSES.length - 1)]!;

  return {
    name: `Funnel ${secureRandomInt(100, 999)}`,
    className,
    level,
    stats: {
      abilities: abilityRecord,
      speed: 30,
      armorSpeedPenalty: 0,
      movementModifiers: [],
      initiative: abilityRecord.agi.modifier,
    },
    combat: {
      ac: 10 + abilityRecord.agi.modifier,
      hpMax,
      hpCurrent: hpMax,
    },
  };
}
