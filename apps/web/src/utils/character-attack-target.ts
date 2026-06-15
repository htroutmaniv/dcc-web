import type { GameMonsterInstance } from '@dcc-web/shared';
import {
  isMonsterActive,
  isMonsterInPlay,
  isMonsterKilled,
} from '@dcc-web/shared';
import type { Character } from '../types/game';

/** Value format: `monster:<uuid>` or `npc:<uuid>`. */
export const CHARACTER_ATTACK_TARGET_KEY = 'attackTarget';

export function readCharacterAttackTargetMap(
  characters: Character[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of characters) {
    const raw = c.stats?.custom?.[CHARACTER_ATTACK_TARGET_KEY];
    if (typeof raw === 'string' && raw.includes(':')) {
      map[c.id] = raw;
    }
  }
  return map;
}

export function parseAttackTargetRef(
  ref: string | null | undefined,
): { type: 'monster' | 'npc'; id: string } | null {
  if (!ref || !ref.includes(':')) return null;
  const [type, id] = ref.split(':');
  if ((type === 'monster' || type === 'npc') && id) {
    return { type, id };
  }
  return null;
}

export function isAttackTargetRefValid(
  ref: string,
  monsters: GameMonsterInstance[],
  npcTokens: { id: string }[],
): boolean {
  const parsed = parseAttackTargetRef(ref);
  if (!parsed) return false;
  if (parsed.type === 'npc') {
    return npcTokens.some((t) => t.id === parsed.id);
  }
  const monster = monsters.find((m) => m.id === parsed.id);
  if (!monster) return false;
  return !isMonsterKilled(monster) && isMonsterActive(monster) && isMonsterInPlay(monster);
}

export function findStaleAttackTargetCharacterIds(
  characters: Character[],
  monsters: GameMonsterInstance[],
  npcTokens: { id: string }[],
  targetById: Record<string, string>,
): string[] {
  const stale: string[] = [];
  for (const c of characters) {
    const ref = targetById[c.id] ?? readCharacterAttackTargetMap([c])[c.id];
    if (!ref) continue;
    if (!isAttackTargetRefValid(ref, monsters, npcTokens)) {
      stale.push(c.id);
    }
  }
  return stale;
}
