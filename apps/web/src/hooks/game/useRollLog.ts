import { useCallback, useState } from 'react';
import type { DiceRollKind, GameInitiativeState } from '@dcc-web/shared';
import { api } from '../../api/client';
import type { DiceResult } from '../../types/game';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import { parseRollLogEntry } from '../../utils/roll-log';
import { recordFullListFetch } from '../../utils/game-fetch-metrics';

export function useRollLog(gameId: string | undefined) {
  const [rollLog, setRollLog] = useState<DiceRollLogEntry[]>([]);
  const [lastRoll, setLastRoll] = useState<DiceResult | null>(null);

  const loadDiceRolls = useCallback(async () => {
    if (!gameId) return;
    recordFullListFetch('diceRolls');
    const data = await api<{ rolls: DiceRollLogEntry[] }>(
      `/games/${gameId}/dice-rolls?limit=80`,
    );
    setRollLog(data.rolls);
    return data.rolls;
  }, [gameId]);

  const appendRollLog = useCallback((entry: DiceRollLogEntry) => {
    setRollLog((prev) => {
      if (prev.some((r) => r.id === entry.id)) return prev;
      return [...prev, entry].slice(-100);
    });
    setLastRoll(entry);
  }, []);

  return {
    rollLog,
    setRollLog,
    lastRoll,
    loadDiceRolls,
    appendRollLog,
  };
}

export function useDiceRollActions(
  gameId: string | undefined,
  appendRollLog: (entry: DiceRollLogEntry) => void,
  applyInitiative: (next: GameInitiativeState | null) => void,
) {
  const postDiceRoll = useCallback(
    async (params: {
      notation: string;
      reason?: string;
      rollKind?: DiceRollKind;
      characterId?: string;
      targetType?: 'character' | 'monster' | 'npc';
      targetId?: string;
    }) => {
      if (!gameId) throw new Error('No game');
      const { result, initiative: initiativeUpdate } = await api<{
        result: DiceRollLogEntry;
        initiative?: GameInitiativeState | null;
      }>('/dice/roll', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          notation: params.notation,
          reason: params.reason,
          rollKind: params.rollKind,
          characterId: params.characterId,
          targetType: params.targetType,
          targetId: params.targetId,
        }),
      });
      const entry = parseRollLogEntry(result) ?? (result as DiceRollLogEntry);
      appendRollLog(entry);
      if (initiativeUpdate) applyInitiative(initiativeUpdate);
      return entry;
    },
    [gameId, appendRollLog, applyInitiative],
  );

  return { postDiceRoll };
}

export type RollLogState = ReturnType<typeof useRollLog>;
