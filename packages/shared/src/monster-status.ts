import type { MonsterStatsJson } from './monster-sheet.js';

export const MONSTER_KILLED_KEY = 'killed';
/** When set on stats.custom, monster is eligible for shared initiative / quick combat. */
export const MONSTER_IN_PLAY_KEY = 'activeInPlay';

export function isMonsterKilled(monster: { stats?: MonsterStatsJson | null }): boolean {
  return monster.stats?.custom?.[MONSTER_KILLED_KEY] === true;
}

export function isMonsterInPlay(monster: { stats?: MonsterStatsJson | null }): boolean {
  const custom = monster.stats?.custom;
  if (custom && MONSTER_IN_PLAY_KEY in custom) {
    return Boolean(custom[MONSTER_IN_PLAY_KEY]);
  }
  return false;
}

/** Slain or at 0 HP / below; may remain in list until removed. */
export function isMonsterActive(monster: { hpCurrent: number; stats?: MonsterStatsJson | null }): boolean {
  return !isMonsterKilled(monster) && monster.hpCurrent > 0;
}

export function isMonsterEligibleForInitiative(monster: {
  hpCurrent: number;
  stats?: MonsterStatsJson | null;
}): boolean {
  return isMonsterInPlay(monster) && isMonsterActive(monster);
}

export function buildMonsterKilledStats(
  stats: MonsterStatsJson | undefined,
  killed: boolean,
): MonsterStatsJson {
  const custom = { ...(stats?.custom ?? {}), [MONSTER_KILLED_KEY]: killed };
  return { ...stats, custom };
}
