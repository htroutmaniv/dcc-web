import { useCallback, useState } from 'react';
import {
  ACTIVE_IN_PLAY_KEY,
  ACTIVE_LIGHT_ITEM_ID_KEY,
  MAP_TOKEN_VISIBLE_KEY,
  USING_LIGHT_SOURCE_KEY,
  getActiveLightItemId,
  isUsingLightSource,
  resolveActiveLightItemId,
} from '@dcc-web/shared';
import type { CreateCharacterPayload } from '../../components/CreateCharacterDialog';
import type { GameMenuTab } from '../../components/GameSideMenu';
import { api } from '../../api/client';
import type { Character } from '../../types/game';
import {
  buildItemsAfterActivateLight,
  buildItemsAfterConsume,
  canExpendLightSource,
} from '../../utils/consumables';
import { CHARACTER_ATTACK_TARGET_KEY } from '../../utils/character-attack-target';
import { formatError } from '../../utils/errors';
import { parseCharacterResponse } from './parse-character-response.js';

export type CharacterActionsDeps = {
  gameId: string | undefined;
  isDm: boolean;
  userId: string | undefined;
  characters: Character[];
  characterAttackTargetById: Record<string, string>;
  setCharacterAttackTargetById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyCharacterFromServer: (character: Character) => void;
  loadMaps: () => Promise<unknown>;
  selectedCharacter: Character | null;
  setSelectedCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  activeMapId: string | null;
  activeMapTokens: { id: string; characterId: string | null }[];
  setMenuTab: (tab: GameMenuTab) => void;
  setCreateDialogOpen: (open: boolean) => void;
  onError: (message: string | null) => void;
};

export function useCharacterActions(deps: CharacterActionsDeps) {
  const {
    gameId,
    isDm,
    userId,
    characters,
    characterAttackTargetById,
    setCharacterAttackTargetById,
    applyCharacterFromServer,
    loadMaps,
    selectedCharacter,
    setSelectedCharacter,
    activeMapId,
    activeMapTokens,
    setMenuTab,
    setCreateDialogOpen,
    onError,
  } = deps;

  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [consumableAdjustingId, setConsumableAdjustingId] = useState<string | null>(null);
  const [hpAdjustingId, setHpAdjustingId] = useState<string | null>(null);
  const [consumeDialog, setConsumeDialog] = useState<{
    character: Character;
    kind: 'food' | 'drink';
  } | null>(null);
  const [mapTokenBusyId, setMapTokenBusyId] = useState<string | null>(null);

  const canEditCharacter = useCallback(
    (c: Character) => isDm || (userId != null && c.ownerUserId === userId),
    [isDm, userId],
  );

  const createCharacter = async (payload: CreateCharacterPayload) => {
    if (!gameId) return;
    setCreatingCharacter(true);
    try {
      const { character } = await api<{ character: Character }>(
        `/games/${gameId}/characters`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      applyCharacterFromServer(character);
      await loadMaps();
      setSelectedCharacter(character);
      setMenuTab('characters');
      setCreateDialogOpen(false);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setCreatingCharacter(false);
    }
  };

  const setCharacterWeapon = async (character: Character, weaponId: string) => {
    const weapon = (character.items ?? []).find(
      (i) => i.category === 'weapon' && i.id === weaponId,
    );
    if (!weapon) return;
    const prevStats = character.stats ?? {};
    const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
    try {
      const updated = parseCharacterResponse(
        await api<{ character: Character } | Character>(`/characters/${character.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...prevStats,
              custom: {
                ...prevCustom,
                selectedWeaponId: weaponId,
                selectedWeaponName: weapon.name,
              },
            },
          }),
        }),
      );
      if (updated) applyCharacterFromServer(updated);
    } catch (e) {
      onError(formatError(e));
    }
  };

  const setCharacterAttackTarget = async (characterId: string, targetRef: string | null) => {
    setCharacterAttackTargetById((prev) => {
      const next = { ...prev };
      if (targetRef) next[characterId] = targetRef;
      else delete next[characterId];
      return next;
    });
    const c = characters.find((x) => x.id === characterId);
    if (!c) return;
    const prevCustom = (c.stats?.custom ?? {}) as Record<string, unknown>;
    try {
      const updated = parseCharacterResponse(
        await api<{ character: Character } | Character>(`/characters/${c.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...c.stats,
              custom: { ...prevCustom, [CHARACTER_ATTACK_TARGET_KEY]: targetRef ?? '' },
            },
          }),
        }),
      );
      if (updated) applyCharacterFromServer(updated);
    } catch {
      /* keep local selection */
    }
  };

  const patchCharacterHp = async (character: Character, hpCurrent: number) => {
    const hpMax =
      typeof character.combat?.hpMax === 'number'
        ? character.combat.hpMax
        : Math.max(0, hpCurrent);
    const nextHp = typeof hpMax === 'number' && hpCurrent > hpMax ? hpMax : hpCurrent;
    setHpAdjustingId(character.id);
    try {
      const updated = parseCharacterResponse(
        await api<{ character: Character } | Character>(`/characters/${character.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            combat: { ...(character.combat ?? {}), hpCurrent: nextHp, hpMax },
          }),
        }),
      );
      if (updated) applyCharacterFromServer(updated);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setHpAdjustingId(null);
    }
  };

  async function putCharacterItems(
    character: Character,
    items: {
      id?: string;
      category: string;
      name: string;
      quantity: number;
      notes?: string;
      properties?: Record<string, unknown>;
    }[],
  ) {
    const { character: updated } = await api<{ character: Character }>(
      `/characters/${character.id}/items`,
      { method: 'PUT', body: JSON.stringify({ items }) },
    );
    return updated;
  }

  async function patchLightCustom(
    character: Character,
    patch: { equippedId?: string | null; lit?: boolean },
  ): Promise<Character> {
    const prevStats = character.stats ?? {};
    const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
    const res = await api<{ character: Character }>(`/characters/${character.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stats: {
          ...prevStats,
          custom: {
            ...prevCustom,
            ...(patch.equippedId !== undefined && {
              [ACTIVE_LIGHT_ITEM_ID_KEY]: patch.equippedId,
            }),
            ...(patch.lit !== undefined && { [USING_LIGHT_SOURCE_KEY]: patch.lit }),
          },
        },
      }),
    });
    return res.character;
  }

  async function reconcileEquippedLight(
    character: Character,
    previousActiveId: string | undefined,
    previousItems?: Character['items'],
  ): Promise<Character> {
    if (!previousActiveId) return character;
    const resolved = resolveActiveLightItemId(
      character.items ?? [],
      previousActiveId,
      previousItems,
    );
    if (!resolved) return patchLightCustom(character, { equippedId: null, lit: false });
    let updated = character;
    if (resolved !== getActiveLightItemId(character)) {
      updated = await patchLightCustom(updated, { equippedId: resolved });
    }
    if (isUsingLightSource(updated)) {
      const canExpend = canExpendLightSource(updated.items ?? [], resolved);
      if (!canExpend.ok) updated = await patchLightCustom(updated, { lit: false });
    }
    return updated;
  }

  async function clearLightIfInvalid(character: Character): Promise<Character> {
    const activeId = getActiveLightItemId(character);
    if (!activeId) {
      if (!isUsingLightSource(character)) return character;
      return patchLightCustom(character, { lit: false });
    }
    return reconcileEquippedLight(character, activeId, character.items);
  }

  const openConsumeDialog = (character: Character, kind: 'food' | 'drink') => {
    if (!canEditCharacter(character)) return;
    setConsumeDialog({ character, kind });
  };

  const applyConsumeItem = async (itemId: string, units = 1) => {
    const target = consumeDialog?.character;
    if (!target) return;
    setConsumableAdjustingId(target.id);
    try {
      const built = buildItemsAfterConsume(target, itemId, units);
      if (!built.ok) {
        onError(built.message ?? 'Could not consume');
        return;
      }
      let updated = await putCharacterItems(target, built.items);
      updated = await clearLightIfInvalid(updated);
      applyCharacterFromServer(updated);
      setConsumeDialog(null);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const selectActiveLight = async (character: Character, lightItemId: string | null) => {
    if (!canEditCharacter(character)) return;
    setConsumableAdjustingId(character.id);
    try {
      let updated = await patchLightCustom(character, { equippedId: lightItemId });
      if (!lightItemId) updated = await patchLightCustom(updated, { lit: false });
      updated = await clearLightIfInvalid(updated);
      applyCharacterFromServer(updated);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const toggleLightLit = async (character: Character, lit: boolean) => {
    if (!canEditCharacter(character)) return;
    if (lit && !getActiveLightItemId(character)) {
      onError('Select a light source first');
      return;
    }
    setConsumableAdjustingId(character.id);
    try {
      applyCharacterFromServer(await patchLightCustom(character, { lit }));
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const expendActiveLight = async (character: Character) => {
    if (!canEditCharacter(character)) return;
    const activeId = getActiveLightItemId(character);
    if (!activeId) {
      onError('Select an active light source first');
      return;
    }
    setConsumableAdjustingId(character.id);
    try {
      const built = buildItemsAfterActivateLight(character, activeId);
      if (!built.ok) {
        onError(built.message ?? 'Could not expend');
        return;
      }
      const itemsBefore = character.items;
      let updated = await putCharacterItems(character, built.items);
      updated = await reconcileEquippedLight(updated, activeId, itemsBefore);
      applyCharacterFromServer(updated);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const toggleInPlay = async (character: Character, active: boolean) => {
    if (!canEditCharacter(character)) return;
    setConsumableAdjustingId(character.id);
    try {
      const prevStats = character.stats ?? {};
      const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
      const { character: updated } = await api<{ character: Character }>(
        `/characters/${character.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...prevStats,
              custom: { ...prevCustom, [ACTIVE_IN_PLAY_KEY]: active },
            },
          }),
        },
      );
      applyCharacterFromServer(updated);
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setConsumableAdjustingId(null);
    }
  };

  const patchCharacterStatus = async (
    characterId: string,
    status: 'alive' | 'dead' | 'archived',
  ) => {
    try {
      const updated = parseCharacterResponse(
        await api<{ character: Character } | Character>(`/characters/${characterId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),
      );
      if (updated) applyCharacterFromServer(updated);
      if (status === 'archived' && selectedCharacter?.id === characterId) {
        setSelectedCharacter(null);
      }
      await loadMaps();
      onError(null);
    } catch (e) {
      onError(formatError(e));
    }
  };

  const markDead = (characterId: string) => patchCharacterStatus(characterId, 'dead');
  const reviveCharacter = (characterId: string) => patchCharacterStatus(characterId, 'alive');
  const archiveCharacter = (characterId: string) =>
    patchCharacterStatus(characterId, 'archived');

  const hasCharacterMapToken = useCallback(
    (characterId: string) => activeMapTokens.some((t) => t.characterId === characterId),
    [activeMapTokens],
  );

  const toggleCharacterMapToken = async (character: Character, visible: boolean) => {
    if (!gameId || !activeMapId || !isDm) return;
    setMapTokenBusyId(character.id);
    try {
      const prevStats = character.stats ?? {};
      const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
      const updated = parseCharacterResponse(
        await api<{ character: Character } | Character>(`/characters/${character.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            stats: {
              ...prevStats,
              custom: { ...prevCustom, [MAP_TOKEN_VISIBLE_KEY]: visible },
            },
          }),
        }),
      );
      if (updated) applyCharacterFromServer(updated);
      await api(`/games/${gameId}/maps/${activeMapId}/sync-tokens`, { method: 'POST' });
      await loadMaps();
      onError(null);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setMapTokenBusyId(null);
    }
  };

  return {
    creatingCharacter,
    consumableAdjustingId,
    hpAdjustingId,
    consumeDialog,
    setConsumeDialog,
    mapTokenBusyId,
    canEditCharacter,
    createCharacter,
    setCharacterWeapon,
    setCharacterAttackTarget,
    patchCharacterHp,
    openConsumeDialog,
    applyConsumeItem,
    selectActiveLight,
    toggleLightLit,
    expendActiveLight,
    toggleInPlay,
    markDead,
    reviveCharacter,
    archiveCharacter,
    hasCharacterMapToken,
    toggleCharacterMapToken,
    characterAttackTargetById,
  };
}
