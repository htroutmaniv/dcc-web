import type { GameMonsterInstance } from '@dcc-web/shared';

export const MONSTER_ATTACK_TARGET_KEY = 'attackTargetId';

export function readMonsterTargetMap(monsters: GameMonsterInstance[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of monsters) {
    const id = m.stats?.custom?.[MONSTER_ATTACK_TARGET_KEY];
    if (typeof id === 'string' && id.length > 0) {
      map[m.id] = id;
    }
  }
  return map;
}
