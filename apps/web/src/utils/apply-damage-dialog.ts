import type { RollTargetType } from '@dcc-web/shared';
import type { GameMonsterInstance } from '@dcc-web/shared';
import type { Character } from '../types/game';

export type ApplyDamageTargetTab = 'pc' | 'monster' | 'npc';

export type ApplyDamageNpcTarget = {
  id: string;
  label: string;
};

export function tabForTargetType(type: RollTargetType): ApplyDamageTargetTab {
  if (type === 'character') return 'pc';
  if (type === 'monster') return 'monster';
  return 'npc';
}

/** Initial tab when the apply-damage dialog opens. */
export function initialApplyDamageTab(
  defaultTarget: { type: RollTargetType; id: string } | null | undefined,
): ApplyDamageTargetTab {
  if (defaultTarget) return tabForTargetType(defaultTarget.type);
  return 'monster';
}

export function resolveDefaultTargetLabel(
  defaultTarget: { type: RollTargetType; id: string } | null | undefined,
  characters: Character[],
  monsters: GameMonsterInstance[],
  npcTokens: ApplyDamageNpcTarget[],
): string | null {
  if (!defaultTarget) return null;
  if (defaultTarget.type === 'character') {
    return characters.find((c) => c.id === defaultTarget.id)?.name ?? null;
  }
  if (defaultTarget.type === 'monster') {
    return monsters.find((m) => m.id === defaultTarget.id)?.name ?? null;
  }
  return npcTokens.find((t) => t.id === defaultTarget.id)?.label ?? null;
}
