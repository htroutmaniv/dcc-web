import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import type { GameMonsterInstance } from '../../types/game';
import { readMonsterTargetMap } from '../../utils/monster-targets';

export function useMonsters(gameId: string | undefined, isDm: boolean) {
  const [monsters, setMonsters] = useState<GameMonsterInstance[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<GameMonsterInstance | null>(null);
  const [monsterTargetById, setMonsterTargetById] = useState<Record<string, string>>({});

  const loadMonsters = useCallback(async () => {
    if (!gameId) return;
    const data = await api<{ monsters: GameMonsterInstance[] }>(
      `/games/${gameId}/monsters`,
    );
    setMonsters(data.monsters);
    if (isDm) {
      setMonsterTargetById((prev) => ({
        ...readMonsterTargetMap(data.monsters),
        ...prev,
      }));
    }
    return data.monsters;
  }, [gameId, isDm]);

  const handleMonsterUpdated = useCallback((m: GameMonsterInstance) => {
    setMonsters((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    setSelectedMonster((prev) => (prev?.id === m.id ? m : prev));
  }, []);

  return {
    monsters,
    setMonsters,
    selectedMonster,
    setSelectedMonster,
    monsterTargetById,
    setMonsterTargetById,
    loadMonsters,
    handleMonsterUpdated,
  };
}

export type MonstersState = ReturnType<typeof useMonsters>;
