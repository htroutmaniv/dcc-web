import { useCallback, useState } from 'react';
import {
  MONSTER_IN_PLAY_KEY,
  attackRollHits,
  buildMonsterKilledStats,
  getTargetAc,
  parseMonsterSheet,
  type GameInitiativeState,
} from '@dcc-web/shared';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import type { MonsterCombatRollKind } from '../../components/MonsterQuickMenu';
import { api } from '../../api/client';
import type { Character, GameMonsterInstance } from '../../types/game';
import type { TacticalGameMap } from '../../types/map';
import { MONSTER_ATTACK_TARGET_KEY } from '../../utils/monster-targets';
import { formatError } from '../../utils/errors';

export type MonsterActionsDeps = {
  gameId: string | undefined;
  monsters: GameMonsterInstance[];
  setMonsters: React.Dispatch<React.SetStateAction<GameMonsterInstance[]>>;
  selectedMonster: GameMonsterInstance | null;
  setSelectedMonster: React.Dispatch<React.SetStateAction<GameMonsterInstance | null>>;
  setSelectedCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  monsterTargetById: Record<string, string>;
  setMonsterTargetById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleMonsterUpdated: (monster: GameMonsterInstance) => void;
  applyInitiative: (next: GameInitiativeState | null) => void;
  applyMapFromServer: (map: TacticalGameMap) => void;
  loadCharacters: () => Promise<unknown>;
  postDiceRoll: (params: {
    notation: string;
    reason?: string;
    rollKind?: 'attack' | 'damage' | 'unspecified';
    characterId?: string;
  }) => Promise<DiceRollLogEntry>;
  onError: (message: string | null) => void;
};

export function useMonsterActions(deps: MonsterActionsDeps) {
  const {
    gameId,
    monsters,
    setMonsters,
    selectedMonster,
    setSelectedMonster,
    setSelectedCharacter,
    monsterTargetById,
    setMonsterTargetById,
    handleMonsterUpdated,
    applyInitiative,
    applyMapFromServer,
    loadCharacters,
    postDiceRoll,
    onError,
  } = deps;

  const [monsterBusy, setMonsterBusy] = useState(false);
  const [monsterRollingId, setMonsterRollingId] = useState<string | null>(null);
  const [monsterRollingKind, setMonsterRollingKind] = useState<MonsterCombatRollKind | null>(
    null,
  );
  const [lastMonsterAttackSummary, setLastMonsterAttackSummary] = useState<string | null>(null);

  const toggleMonsterInPlay = async (monster: GameMonsterInstance, active: boolean) => {
    if (!gameId) return;
    setMonsterBusy(true);
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
      handleMonsterUpdated(data.monster);
      if (data.initiative) applyInitiative(data.initiative);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const rollMonsterCombat = async (
    monster: GameMonsterInstance,
    kind: MonsterCombatRollKind,
  ) => {
    if (!gameId) return;
    const atk = parseMonsterSheet(monster.sheet).attacks[0];
    const mod = Number(atk?.attackBonus ?? monster.attackBonus) || 0;
    const damageNotation = atk?.damage ?? monster.damage;
    const atkLabel = atk?.name ?? 'attack';
    const notation =
      kind === 'toHit' ? `1d20${mod >= 0 ? `+${mod}` : mod}` : damageNotation;
    const reason =
      kind === 'toHit' ? `${monster.name} ${atkLabel}` : `${monster.name} damage`;

    setMonsterRollingId(monster.id);
    setMonsterRollingKind(kind);
    setMonsterBusy(true);
    try {
      await postDiceRoll({
        notation,
        reason,
        rollKind: kind === 'toHit' ? 'attack' : 'damage',
      });
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMonsterRollingId(null);
      setMonsterRollingKind(null);
      setMonsterBusy(false);
    }
  };

  const patchMonsterHp = async (monster: GameMonsterInstance, hpCurrent: number) => {
    if (!gameId) return;
    setMonsterBusy(true);
    try {
      const body: Record<string, unknown> = { hpCurrent };
      if (hpCurrent > 0 && monster.stats?.custom?.killed === true) {
        body.stats = buildMonsterKilledStats(monster.stats, false);
      }
      const data = await api<{
        monster: GameMonsterInstance;
        initiative: GameInitiativeState | null;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      handleMonsterUpdated(data.monster);
      if (data.initiative) applyInitiative(data.initiative);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const killMonster = async (monster: GameMonsterInstance) => {
    if (!gameId) return;
    setMonsterBusy(true);
    try {
      const data = await api<{
        monster: GameMonsterInstance;
        initiative: GameInitiativeState | null;
        map?: TacticalGameMap;
      }>(`/games/${gameId}/monsters/${monster.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          hpCurrent: 0,
          stats: buildMonsterKilledStats(monster.stats, true),
        }),
      });
      handleMonsterUpdated(data.monster);
      if (data.initiative) applyInitiative(data.initiative);
      if (data.map) applyMapFromServer(data.map);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const deleteMonsterQuick = async (monsterId: string) => {
    if (!gameId) return;
    setMonsterBusy(true);
    try {
      const data = await api<{
        initiative: GameInitiativeState | null;
        map?: TacticalGameMap;
      }>(
        `/games/${gameId}/monsters/${monsterId}`,
        { method: 'DELETE' },
      );
      setMonsters((prev) => prev.filter((m) => m.id !== monsterId));
      if (selectedMonster?.id === monsterId) setSelectedMonster(null);
      applyInitiative(data.initiative);
      if (data.map) applyMapFromServer(data.map);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const setMonsterAttackTarget = async (monsterId: string, characterId: string | null) => {
    setMonsterTargetById((prev) => {
      const next = { ...prev };
      if (characterId) next[monsterId] = characterId;
      else delete next[monsterId];
      return next;
    });
    const m = monsters.find((x) => x.id === monsterId);
    if (!m || !gameId) return;
    const prevCustom = (m.stats?.custom ?? {}) as Record<string, unknown>;
    try {
      const { monster: updated } = await api<{ monster: GameMonsterInstance }>(
        `/games/${gameId}/monsters/${monsterId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...m.stats,
              custom: { ...prevCustom, [MONSTER_ATTACK_TARGET_KEY]: characterId ?? '' },
            },
          }),
        },
      );
      handleMonsterUpdated(updated);
    } catch {
      /* keep local target selection */
    }
  };

  const rollMonsterAttack = async (monster: GameMonsterInstance, target: Character) => {
    if (!gameId) return;
    const atk = parseMonsterSheet(monster.sheet).attacks[0];
    const mod = Number(atk?.attackBonus ?? monster.attackBonus) || 0;
    const ac = getTargetAc(target.combat);
    const damageNotation = atk?.damage ?? monster.damage;
    const atkLabel = atk?.name ?? 'attack';

    setMonsterBusy(true);
    try {
      const attackResult = await postDiceRoll({
        notation: `1d20${mod >= 0 ? `+${mod}` : mod}`,
        reason: `${monster.name} → ${target.name} ${atkLabel} (AC ${ac})`,
        rollKind: 'attack',
      });
      const natural = attackResult.rolls[0];
      const hit = attackRollHits(attackResult.total, ac, natural);

      if (!hit) {
        setLastMonsterAttackSummary(
          `${monster.name} missed ${target.name}: ${attackResult.total} vs AC ${ac}`,
        );
        onError(null);
        return;
      }

      const damageResult = await postDiceRoll({
        notation: damageNotation,
        reason: `${monster.name} → ${target.name} damage`,
        rollKind: 'damage',
      });
      const { hpAfter } = await api<{ hpAfter: number; targetName: string }>(
        `/games/${gameId}/apply-damage`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: damageResult.total,
            targetType: 'character',
            targetId: target.id,
            rollLogId: damageResult.id,
          }),
        },
      );
      await loadCharacters();
      setLastMonsterAttackSummary(
        `${monster.name} hit ${target.name} (${attackResult.total} vs AC ${ac}) for ${damageResult.total} → ${hpAfter} HP`,
      );
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMonsterBusy(false);
    }
  };

  const openMonsterSheet = useCallback(
    (monsterId: string) => {
      const m = monsters.find((x) => x.id === monsterId);
      if (m) {
        setSelectedMonster(m);
        setSelectedCharacter(null);
      }
    },
    [monsters, setSelectedMonster, setSelectedCharacter],
  );

  return {
    monsterBusy,
    monsterRollingId,
    monsterRollingKind,
    lastMonsterAttackSummary,
    monsterTargetById,
    toggleMonsterInPlay,
    rollMonsterCombat,
    patchMonsterHp,
    killMonster,
    deleteMonsterQuick,
    setMonsterAttackTarget,
    rollMonsterAttack,
    openMonsterSheet,
  };
}
