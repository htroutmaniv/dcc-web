import type { MonsterStatsJson } from './monster-sheet.js';

export const MONSTER_KILLED_KEY = 'killed';

export function isMonsterKilled(monster: { stats?: MonsterStatsJson | null }): boolean {
  return monster.stats?.custom?.[MONSTER_KILLED_KEY] === true;
}

/** Slain or at 0 HP / below; may remain in list until removed. */
export function isMonsterActive(monster: { hpCurrent: number; stats?: MonsterStatsJson | null }): boolean {
  return !isMonsterKilled(monster) && monster.hpCurrent > 0;
}

export function buildMonsterKilledStats(
  stats: MonsterStatsJson | undefined,
  killed: boolean,
): MonsterStatsJson {
  const custom = { ...(stats?.custom ?? {}), [MONSTER_KILLED_KEY]: killed };
  return { ...stats, custom };
}
