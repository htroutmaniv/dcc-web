import type { DiceRollKind } from '@dcc-web/shared';

export interface DiceRollLogEntry {
  id: string;
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  rollKind: DiceRollKind;
  reason?: string;
  characterId?: string;
  characterName?: string;
  actorUserId?: string;
  actorName?: string;
  createdAt: string;
}
