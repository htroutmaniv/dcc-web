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
