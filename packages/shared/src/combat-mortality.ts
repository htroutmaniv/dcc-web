import type { MonsterStatsJson } from './monster-sheet.js';
import { buildMonsterKilledStats, isMonsterKilled } from './monster-status.js';

/** Rounds remaining before death while at 0 HP or below (level 1+ only). Stored on combat.custom. */
export const MORTAL_ROUNDS_KEY = 'mortalRoundsRemaining';

export type CombatVitality = 'healthy' | 'dying' | 'dead';

export interface CharacterCombatLike {
  hpCurrent?: number;
  hpMax?: number;
  custom?: Record<string, unknown>;
}

export function getMortalRoundsRemaining(
  combat?: CharacterCombatLike | null,
): number | null {
  const raw = combat?.custom?.[MORTAL_ROUNDS_KEY];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  return Math.max(0, Math.floor(raw));
}

export function initialMortalRounds(level: number): number {
  return Math.max(1, level);
}

export function getCharacterVitality(character: {
  level: number;
  status: string;
  combat?: CharacterCombatLike | null;
}): CombatVitality {
  if (character.status === 'dead') return 'dead';
  const hp = character.combat?.hpCurrent;
  if (typeof hp !== 'number') return 'healthy';
  if (hp > 0) return 'healthy';
  if (character.level === 0) return 'dead';
  return 'dying';
}

export function resolveCharacterCombatAfterHpChange(params: {
  level: number;
  status: string;
  hpBefore: number;
  hpAfter: number;
  combat: Record<string, unknown>;
}): { combat: Record<string, unknown>; markDead: boolean } {
  const { level, status, hpBefore, hpAfter, combat } = params;
  if (status === 'dead') {
    return { combat: { ...combat, hpCurrent: hpAfter }, markDead: false };
  }

  const custom = { ...((combat.custom as Record<string, unknown> | undefined) ?? {}) };
  let markDead = false;
  const hpCurrent = hpAfter;

  if (hpCurrent > 0) {
    delete custom[MORTAL_ROUNDS_KEY];
  } else if (level === 0) {
    markDead = true;
    delete custom[MORTAL_ROUNDS_KEY];
  } else if (hpBefore > 0 || !(MORTAL_ROUNDS_KEY in custom)) {
    custom[MORTAL_ROUNDS_KEY] = initialMortalRounds(level);
  }

  return {
    combat: { ...combat, hpCurrent, custom },
    markDead,
  };
}

export function tickMortalRound(
  combat: Record<string, unknown>,
  level: number,
): { combat: Record<string, unknown>; markDead: boolean } {
  const hpCurrent = typeof combat.hpCurrent === 'number' ? combat.hpCurrent : 0;
  if (hpCurrent > 0 || level === 0) {
    return { combat, markDead: false };
  }

  const custom = { ...((combat.custom as Record<string, unknown> | undefined) ?? {}) };
  const remaining =
    getMortalRoundsRemaining({ custom }) ?? initialMortalRounds(level);
  const next = remaining - 1;
  if (next <= 0) {
    delete custom[MORTAL_ROUNDS_KEY];
    return { combat: { ...combat, custom }, markDead: true };
  }
  custom[MORTAL_ROUNDS_KEY] = next;
  return { combat: { ...combat, custom }, markDead: false };
}

export function resolveMonsterAfterHpChange(
  hpCurrent: number,
  stats?: MonsterStatsJson | null,
): { hpCurrent: number; stats: MonsterStatsJson; killed: boolean } {
  const base = stats ?? {};
  if (hpCurrent <= 0) {
    return {
      hpCurrent,
      stats: buildMonsterKilledStats(base, true),
      killed: true,
    };
  }
  if (isMonsterKilled({ stats: base })) {
    return {
      hpCurrent,
      stats: buildMonsterKilledStats(base, false),
      killed: false,
    };
  }
  return { hpCurrent, stats: base, killed: false };
}

export function isMonsterDown(monster: {
  hpCurrent: number;
  stats?: MonsterStatsJson | null;
}): boolean {
  return isMonsterKilled(monster) || monster.hpCurrent <= 0;
}

export function formatCharacterVitalityBadge(character: {
  level: number;
  status: string;
  combat?: CharacterCombatLike | null;
}): string | null {
  const vitality = getCharacterVitality(character);
  if (vitality === 'dead') return 'Killed';
  if (vitality === 'dying') {
    const rounds =
      getMortalRoundsRemaining(character.combat) ?? initialMortalRounds(character.level);
    return `Dying (${rounds}r)`;
  }
  return null;
}

export function clampCharacterHpUpper(hpCurrent: number, hpMax: number | undefined): number {
  if (typeof hpMax === 'number' && hpCurrent > hpMax) return hpMax;
  return hpCurrent;
}
