import type { GameMonsterInstance } from '@dcc-web/shared';
import {
  isMonsterActive,
  isMonsterInPlay,
  isMonsterKilled,
} from '@dcc-web/shared';

export type CombatTargetOption = {
  type: 'monster' | 'npc';
  id: string;
  label: string;
  ac: number;
};

export function buildCombatTargetOptions(
  monsters: GameMonsterInstance[],
  npcTokens: { id: string; label: string }[],
): CombatTargetOption[] {
  const out: CombatTargetOption[] = [];
  for (const m of monsters) {
    if (isMonsterKilled(m) || !isMonsterActive(m) || !isMonsterInPlay(m)) continue;
    out.push({
      type: 'monster',
      id: m.id,
      label: m.name,
      ac: m.ac,
    });
  }
  for (const t of npcTokens) {
    out.push({ type: 'npc', id: t.id, label: t.label, ac: 10 });
  }
  return out;
}
