import { useMemo, useState, useCallback } from 'react';
import { api } from '../../api/client';
import type { GameMonsterInstance } from '../../types/game';
import { readMonsterTargetMap } from '../../utils/monster-targets';
import { dedupeAsync } from '../../utils/dedupe-async';
import { recordFullListFetch } from '../../utils/game-fetch-metrics';

export function useMonsters(gameId: string | undefined, isDm: boolean) {
  const [monsters, setMonsters] = useState<GameMonsterInstance[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<GameMonsterInstance | null>(null);

  const monsterTargetById = useMemo(
    () => (isDm ? readMonsterTargetMap(monsters) : {}),
    [monsters, isDm],
  );

  const loadMonsters = useMemo(
    () =>
      dedupeAsync(async () => {
        if (!gameId) return;
        recordFullListFetch('monsters');
        const data = await api<{ monsters: GameMonsterInstance[] }>(
          `/games/${gameId}/monsters`,
        );
        setMonsters(data.monsters);
        return data.monsters;
      }),
    [gameId],
  );

  const handleMonsterUpdated = useCallback((m: GameMonsterInstance) => {
    setMonsters((prev) => {
      const idx = prev.findIndex((x) => x.id === m.id);
      if (idx >= 0) return prev.map((x) => (x.id === m.id ? m : x));
      return [...prev, m];
    });
    setSelectedMonster((prev) => (prev?.id === m.id ? m : prev));
  }, []);

  return {
    monsters,
    setMonsters,
    selectedMonster,
    setSelectedMonster,
    monsterTargetById,
    loadMonsters,
    handleMonsterUpdated,
  };
}

export type MonstersState = ReturnType<typeof useMonsters>;
