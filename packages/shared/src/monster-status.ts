import type { MonsterStatsJson } from './monster-sheet.js';

export const MONSTER_KILLED_KEY = 'killed';

export function isMonsterKilled(monster: { stats?: MonsterStatsJson | null }): boolean {
  return monster.stats?.custom?.[MONSTER_KILLED_KEY] === true;
}

/** In combat (not slain); may be at 0 HP until the DM clicks Kill. */
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
