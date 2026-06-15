import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildMonsterKilledStats,
  isMonsterKilled,
  MONSTER_IN_PLAY_KEY,
  scaleMonsterStats,
  type GameInitiativeState,
  type GameMonsterInstance,
  type MonsterCatalogEntry,
} from '@dcc-web/shared';
import { api } from '../../api/client';
import { formatError } from '../../utils/errors';

export const DEFAULT_CUSTOM_MONSTER = {
  name: 'Custom creature',
  hitDice: '2d8',
  ac: 12,
  attackBonus: 1,
  damage: '1d6',
  initMod: 0,
  speed: 30,
  hpMax: 9,
};

export type MonsterPanelMode = 'manual' | 'catalog';

type UseMonsterPanelStateArgs = {
  gameId: string;
  monsters: GameMonsterInstance[];
  busy?: boolean;
  onMonstersChange: (monsters: GameMonsterInstance[]) => void;
  onInitiativeChange?: (initiative: GameInitiativeState | null) => void;
  onError?: (message: string | null) => void;
};

export function useMonsterPanelState({
  gameId,
  monsters,
  busy,
  onMonstersChange,
  onInitiativeChange,
  onError,
}: UseMonsterPanelStateArgs) {
  const [mode, setMode] = useState<MonsterPanelMode>('catalog');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogOptions, setCatalogOptions] = useState<MonsterCatalogEntry[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<MonsterCatalogEntry | null>(null);
  const [scaleLevel, setScaleLevel] = useState(1);
  const [spawnCount, setSpawnCount] = useState(1);
  const [custom, setCustom] = useState(DEFAULT_CUSTOM_MONSTER);
  const [spawning, setSpawning] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);

  const loadCatalog = useCallback(async (q: string) => {
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (q.trim()) params.set('q', q.trim());
      const data = await api<{ monsters: MonsterCatalogEntry[] }>(
        `/monsters/catalog?${params}`,
      );
      setCatalogOptions(data.monsters);
    } catch {
      setCatalogOptions([]);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => loadCatalog(catalogQuery), 250);
    return () => window.clearTimeout(t);
  }, [catalogQuery, loadCatalog]);

  useEffect(() => {
    if (selectedCatalog) {
      setScaleLevel(Math.max(0, selectedCatalog.baseLevel));
    }
  }, [selectedCatalog]);

  const scaledPreview = useMemo(() => {
    if (!selectedCatalog) return null;
    return scaleMonsterStats(
      {
        hitDice: selectedCatalog.hitDice,
        ac: selectedCatalog.ac,
        attackBonus: selectedCatalog.attackBonus,
        damage: selectedCatalog.damage,
        initMod: selectedCatalog.initMod,
        speed: selectedCatalog.speed,
        hpAvg: selectedCatalog.hpAvg,
      },
      selectedCatalog.baseLevel,
      scaleLevel,
    );
  }, [selectedCatalog, scaleLevel]);

  const disabled = busy || spawning || localBusy;

  const spawn = async () => {
    setSpawning(true);
    onError?.(null);
    try {
      const body =
        mode === 'catalog' && selectedCatalog
          ? { catalogId: selectedCatalog.id, count: spawnCount, scaleLevel }
          : { custom, count: spawnCount, scaleLevel: 0 };

      if (mode === 'catalog' && !selectedCatalog) {
        onError?.('Pick a monster from the manual');
        return;
      }

      const data = await api<{
        monsters: GameMonsterInstance[];
        initiative: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/spawn`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onMonstersChange([...monsters, ...data.monsters]);
      if (data.initiative) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setSpawning(false);
    }
  };

  const patchHp = async (monster: GameMonsterInstance, hpCurrent: number) => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const body: Record<string, unknown> = { hpCurrent };
      if (hpCurrent > 0 && isMonsterKilled(monster)) {
        body.stats = buildMonsterKilledStats(monster.stats, false);
      }
      const data = await api<{
        monster: GameMonsterInstance;
        initiative?: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      onMonstersChange(monsters.map((m) => (m.id === monster.id ? data.monster : m)));
      if (data.initiative) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  const killMonster = async (monster: GameMonsterInstance) => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const data = await api<{
        monster: GameMonsterInstance;
        initiative?: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          hpCurrent: 0,
          stats: buildMonsterKilledStats(monster.stats, true),
        }),
      });
      onMonstersChange(monsters.map((m) => (m.id === monster.id ? data.monster : m)));
      if (data.initiative) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  const removeMonster = async (monsterId: string) => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const data = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/monsters/${monsterId}`,
        { method: 'DELETE' },
      );
      onMonstersChange(monsters.filter((m) => m.id !== monsterId));
      if (data.initiative !== undefined) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  const toggleInPlay = async (monster: GameMonsterInstance, active: boolean) => {
    setLocalBusy(true);
    onError?.(null);
    try {
      const prevCustom = (monster.stats?.custom ?? {}) as Record<string, unknown>;
      const data = await api<{
        monster: GameMonsterInstance;
        initiative?: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stats: {
            ...monster.stats,
            custom: { ...prevCustom, [MONSTER_IN_PLAY_KEY]: active },
          },
        }),
      });
      onMonstersChange(monsters.map((m) => (m.id === monster.id ? data.monster : m)));
      if (data.initiative) onInitiativeChange?.(data.initiative);
    } catch (e) {
      onError?.(formatError(e));
    } finally {
      setLocalBusy(false);
    }
  };

  return {
    mode,
    setMode,
    catalogQuery,
    setCatalogQuery,
    catalogOptions,
    selectedCatalog,
    setSelectedCatalog,
    scaleLevel,
    setScaleLevel,
    spawnCount,
    setSpawnCount,
    custom,
    setCustom,
    scaledPreview,
    disabled,
    spawn,
    patchHp,
    killMonster,
    removeMonster,
    toggleInPlay,
  };
}

export type MonsterPanelState = ReturnType<typeof useMonsterPanelState>;
