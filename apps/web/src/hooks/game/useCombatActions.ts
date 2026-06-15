import { useState } from 'react';
import { buildDiceNotation, type DiceRollKind, type GameInitiativeState, type GamePatch } from '@dcc-web/shared';
import type { GameMenuTab } from '../../components/GameSideMenu';
import { api } from '../../api/client';
import type { Character } from '../../types/game';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import {
  getCharacterRollSpec,
  type CharacterRollKind,
  type CombatRollKind,
} from '../../utils/character-rolls';
import { characterRollKindToDiceKind } from '../../utils/roll-log';
import { parseAttackTargetRef } from '../../utils/character-attack-target';
import { formatError } from '../../utils/errors';

type ApplyDamageResponse = {
  ok: boolean;
  hpBefore: number;
  hpAfter: number;
  targetName: string;
  patch?: GamePatch;
};

export type CombatActionsDeps = {
  gameId: string | undefined;
  isDm: boolean;
  characters: Character[];
  initiative: GameInitiativeState | null;
  characterAttackTargetById: Record<string, string>;
  diceTrayCounts: ReturnType<typeof import('@dcc-web/shared').emptyDiceTray>;
  diceCharacterId: string | null;
  postDiceRoll: (params: {
    notation: string;
    reason?: string;
    rollKind?: DiceRollKind;
    characterId?: string;
    targetType?: 'character' | 'monster' | 'npc';
    targetId?: string;
  }) => Promise<DiceRollLogEntry>;
  applyGamePatch: (patch: GamePatch) => void;
  applyInitiative: (next: GameInitiativeState | null) => void;
  applyGameSettingsPatch: (patch: {
    monstersVisibleOnMap?: boolean;
    sharedMonsterInitiative?: boolean;
    hideMonsterAcInRollLog?: boolean;
  }) => void;
  setMenuTab: (tab: GameMenuTab) => void;
  setDiceRolling: (rolling: boolean) => void;
  setDiceQuickRollKind: (kind: CharacterRollKind | null) => void;
  onError: (message: string | null) => void;
  monstersVisibleOnMap: boolean;
  sharedMonsterInitiative: boolean;
  hideMonsterAcInRollLog: boolean;
};

export function useCombatActions(deps: CombatActionsDeps) {
  const {
    gameId,
    isDm,
    characters,
    initiative,
    characterAttackTargetById,
    diceTrayCounts,
    diceCharacterId,
    postDiceRoll,
    applyGamePatch,
    applyInitiative,
    applyGameSettingsPatch,
    setMenuTab,
    setDiceRolling,
    setDiceQuickRollKind,
    onError,
    monstersVisibleOnMap,
    sharedMonsterInitiative,
    hideMonsterAcInRollLog,
  } = deps;

  const [rollingCharacterId, setRollingCharacterId] = useState<string | null>(null);
  const [rollingKind, setRollingKind] = useState<CombatRollKind | null>(null);
  const [combatRollByCharacter, setCombatRollByCharacter] = useState<
    Record<string, DiceRollLogEntry>
  >({});
  const [initiativeBusy, setInitiativeBusy] = useState(false);
  const [endTurnCharacterId, setEndTurnCharacterId] = useState<string | null>(null);
  const [applyDamageRoll, setApplyDamageRoll] = useState<DiceRollLogEntry | null>(null);
  const [applyingDamage, setApplyingDamage] = useState(false);

  const rollCharacterCombat = async (character: Character, kind: CombatRollKind) => {
    if (!gameId) return;
    const { notation, reason } = getCharacterRollSpec(character, kind);
    const targetRef =
      initiative?.active && (kind === 'toHit' || kind === 'damage')
        ? characterAttackTargetById[character.id]
        : undefined;
    const parsedTarget = parseAttackTargetRef(targetRef);

    setRollingCharacterId(character.id);
    setRollingKind(kind);
    try {
      const result = await postDiceRoll({
        notation,
        reason,
        rollKind: characterRollKindToDiceKind(kind),
        characterId: character.id,
        ...(parsedTarget && {
          targetType: parsedTarget.type,
          targetId: parsedTarget.id,
        }),
      });
      setCombatRollByCharacter((prev) => ({ ...prev, [character.id]: result }));
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setRollingCharacterId(null);
      setRollingKind(null);
    }
  };

  const rollDiceTray = async () => {
    if (!gameId) return;
    const notation = buildDiceNotation(diceTrayCounts);
    if (!notation) return;
    setDiceRolling(true);
    try {
      await postDiceRoll({ notation, reason: 'Table roll', rollKind: 'unspecified' });
      setMenuTab('dice');
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setDiceRolling(false);
    }
  };

  const rollCharacterQuickRoll = async (kind: CharacterRollKind) => {
    if (!gameId || !diceCharacterId) return;
    const character = characters.find((c) => c.id === diceCharacterId);
    if (!character) return;
    const { notation, reason } = getCharacterRollSpec(character, kind);
    setDiceRolling(true);
    setDiceQuickRollKind(kind);
    try {
      const result = await postDiceRoll({
        notation,
        reason,
        rollKind: characterRollKindToDiceKind(kind),
        characterId: character.id,
      });
      setCombatRollByCharacter((prev) => ({ ...prev, [character.id]: result }));
      setMenuTab('dice');
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setDiceRolling(false);
      setDiceQuickRollKind(null);
    }
  };

  const applyDamageFromRoll = async (
    targetType: 'character' | 'monster' | 'npc',
    targetId: string,
    amount: number,
  ) => {
    if (!gameId) return;
    setApplyingDamage(true);
    try {
      const res = await api<ApplyDamageResponse>(`/games/${gameId}/apply-damage`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          targetType,
          targetId,
          rollLogId: applyDamageRoll?.id,
        }),
      });
      setApplyDamageRoll(null);
      if (res.patch) applyGamePatch(res.patch);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setApplyingDamage(false);
    }
  };

  const runInitiativeAction = async (
    path: string,
    method: 'POST' = 'POST',
    body?: unknown,
  ) => {
    if (!gameId) return;
    setInitiativeBusy(true);
    try {
      const res = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/initiative${path}`,
        { method, body: body ? JSON.stringify(body) : undefined },
      );
      applyInitiative(res.initiative ?? null);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setInitiativeBusy(false);
    }
  };

  const startInitiative = () => void runInitiativeAction('/start');
  const advanceInitiative = () => void runInitiativeAction('/advance');
  const endInitiative = () => void runInitiativeAction('/end');

  const endTurn = async (character: Character) => {
    if (!gameId) return;
    setEndTurnCharacterId(character.id);
    try {
      const res = await api<{ initiative: GameInitiativeState | null }>(
        `/games/${gameId}/initiative/end-turn`,
        {
          method: 'POST',
          body: JSON.stringify({ characterId: character.id }),
        },
      );
      applyInitiative(res.initiative ?? null);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setEndTurnCharacterId(null);
    }
  };

  const toggleMonstersVisibleOnMap = async () => {
    if (!gameId || !isDm) return;
    const next = !monstersVisibleOnMap;
    try {
      await api(`/games/${gameId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ monstersVisibleOnMap: next }),
      });
      applyGameSettingsPatch({ monstersVisibleOnMap: next });
      onError(null);
    } catch (e) {
      onError(formatError(e));
    }
  };

  const toggleSharedMonsterInitiative = async () => {
    if (!gameId || !isDm) return;
    const next = !sharedMonsterInitiative;
    try {
      const res = await api<{ settings: Record<string, unknown> }>(
        `/games/${gameId}/settings`,
        { method: 'PATCH', body: JSON.stringify({ sharedMonsterInitiative: next }) },
      );
      applyGameSettingsPatch({
        sharedMonsterInitiative:
          typeof res.settings?.sharedMonsterInitiative === 'boolean'
            ? res.settings.sharedMonsterInitiative
            : next,
      });
      onError(null);
    } catch (e) {
      onError(formatError(e));
    }
  };

  const toggleHideMonsterAcInRollLog = async () => {
    if (!gameId || !isDm) return;
    const next = !hideMonsterAcInRollLog;
    try {
      await api(`/games/${gameId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ hideMonsterAcInRollLog: next }),
      });
      applyGameSettingsPatch({ hideMonsterAcInRollLog: next });
      onError(null);
    } catch (e) {
      onError(formatError(e));
    }
  };

  return {
    rollingCharacterId,
    rollingKind,
    combatRollByCharacter,
    setCombatRollByCharacter,
    initiativeBusy,
    endTurnCharacterId,
    applyDamageRoll,
    setApplyDamageRoll,
    applyingDamage,
    rollCharacterCombat,
    rollDiceTray,
    rollCharacterQuickRoll,
    applyDamageFromRoll,
    startInitiative,
    advanceInitiative,
    endInitiative,
    endTurn,
    toggleMonstersVisibleOnMap,
    toggleSharedMonsterInitiative,
    toggleHideMonsterAcInRollLog,
  };
}
