import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { parseCharacterResponse } from '../../hooks/game';
import type { Character, User } from '../../types/game';
import {
  mapCharacterToLevel0Sheet,
  sheetDataToCharacterPatch,
  type Level0SheetData,
} from '../../utils/character-sheet';
import { formatError } from '../../utils/errors';
import {
  armorStatsFromItem,
  combineArmorStats,
  computeAc,
  computeEffectiveSpeed,
  deriveArmorOnSheet,
  getBaseSpeed,
  isBodyArmorItem,
  isShieldItem,
  NO_EQUIP_ID,
} from '../../utils/armor';
import {
  formatCharacterVitalityBadge,
  getCharacterVitality,
} from '@dcc-web/shared';
import type { GameMonsterInstance } from '@dcc-web/shared';
import type { TransferInventoryResult } from '../inventory/TransferItemDialog';

export interface CharacterSheetViewProps {
  character: Character;
  gameId?: string;
  partyCharacters?: Character[];
  partyMonsters?: GameMonsterInstance[];
  onInventoryTransferred?: (result: TransferInventoryResult) => void;
  onClose: () => void;
  onCharacterUpdated?: (character: Character) => void;
  onMonsterUpdated?: (monster: GameMonsterInstance) => void;
  onRevive?: (characterId: string) => void;
  onArchive?: (characterId: string) => void;
  onMarkDead?: (characterId: string) => void;
  isDm?: boolean;
  players?: User[];
  dmUserId?: string;
}

export function useCharacterSheetView({
  character: characterProp,
  onCharacterUpdated,
  isDm,
  dmUserId,
}: CharacterSheetViewProps) {
  const { user } = useAuth();
  const [character, setCharacter] = useState(characterProp);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Level0SheetData>(() =>
    mapCharacterToLevel0Sheet(characterProp),
  );
  const [saving, setSaving] = useState(false);
  const [hpAdjusting, setHpAdjusting] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDead =
    character.status === 'dead' ||
    getCharacterVitality({
      level: character.level,
      status: character.status,
      combat: character.combat,
    }) === 'dead';

  const vitalityLabel = formatCharacterVitalityBadge({
    level: character.level,
    status: character.status,
    combat: character.combat,
  });

  const canEdit = isDm || (user != null && character.ownerUserId === user.id);

  useEffect(() => {
    setCharacter(characterProp);
    setDraft(mapCharacterToLevel0Sheet(characterProp));
    setEditing(false);
    setError(null);
  }, [characterProp]);

  const startEdit = () => {
    setDraft(mapCharacterToLevel0Sheet(character));
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setDraft(mapCharacterToLevel0Sheet(character));
    setEditing(false);
    setError(null);
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const body = sheetDataToCharacterPatch(draft, character);
      const res = await api<{ character: Character } | Character>(
        `/characters/${character.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      const updated = parseCharacterResponse(res);
      if (!updated) {
        throw new Error('Save succeeded but no character was returned');
      }
      setCharacter(updated);
      setDraft(mapCharacterToLevel0Sheet(updated));
      onCharacterUpdated?.(updated);
      setEditing(false);
    } catch (e) {
      setError(formatError(e));
      if (e instanceof ApiError && e.status === 403) {
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }, [draft, character, onCharacterUpdated]);

  const patchHp = useCallback(
    async (hpCurrent: number) => {
      const hpMax = character.combat?.hpMax;
      const nextHp =
        typeof hpMax === 'number' && hpCurrent > hpMax ? hpMax : hpCurrent;
      setHpAdjusting(true);
      setError(null);
      try {
        const res = await api<{ character: Character } | Character>(
          `/characters/${character.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              combat: {
                ...(character.combat ?? {}),
                hpCurrent: nextHp,
                hpMax,
              },
            }),
          },
        );
        const updated = parseCharacterResponse(res);
        if (!updated) throw new Error('HP update failed');
        setCharacter(updated);
        setDraft(mapCharacterToLevel0Sheet(updated));
        onCharacterUpdated?.(updated);
      } catch (e) {
        setError(formatError(e));
      } finally {
        setHpAdjusting(false);
      }
    },
    [character, onCharacterUpdated],
  );

  const persistSelectedWeapon = useCallback(
    async (weaponId: string) => {
      const active = (character.items ?? []).find(
        (i) => i.category === 'weapon' && i.id === weaponId,
      );
      if (!active) return;

      const prevStats = character.stats ?? {};
      const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
      try {
        const res = await api<{ character: Character } | Character>(
          `/characters/${character.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              stats: {
                ...prevStats,
                custom: {
                  ...prevCustom,
                  selectedWeaponId: weaponId,
                  selectedWeaponName: active.name,
                },
              },
            }),
          },
        );
        const updated = parseCharacterResponse(res);
        if (!updated) return;
        setCharacter(updated);
        setDraft(mapCharacterToLevel0Sheet(updated));
        onCharacterUpdated?.(updated);
        setError(null);
      } catch (e) {
        setError(formatError(e));
      }
    },
    [character, onCharacterUpdated],
  );

  const persistArmorLoadout = useCallback(
    async (bodyArmorId: string, shieldId: string) => {
      const prevStats = character.stats ?? {};
      const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;
      const prevCombat = character.combat ?? {};
      const abilities = prevStats.abilities ?? {};
      const agiMod = abilities.agi?.modifier ?? 0;
      const baseSpeed = getBaseSpeed(character);

      const items = character.items ?? [];
      const body =
        bodyArmorId && bodyArmorId !== NO_EQUIP_ID
          ? items.find((i) => i.id === bodyArmorId && isBodyArmorItem(i))
          : undefined;
      const shield =
        shieldId && shieldId !== NO_EQUIP_ID
          ? items.find((i) => i.id === shieldId && isShieldItem(i))
          : undefined;

      const equipped = combineArmorStats(
        body ? armorStatsFromItem(body) : null,
        shield ? armorStatsFromItem(shield) : null,
      );
      const ac = computeAc(agiMod, equipped);
      const speed = computeEffectiveSpeed(baseSpeed, equipped);

      const custom: Record<string, unknown> = {
        ...prevCustom,
        baseSpeed,
        selectedArmorId: bodyArmorId || NO_EQUIP_ID,
        selectedShieldId: shieldId || NO_EQUIP_ID,
      };
      if (body?.name) custom.selectedArmorName = body.name;
      if (shield?.name) custom.selectedShieldName = shield.name;

      try {
        const res = await api<{ character: Character } | Character>(
          `/characters/${character.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              stats: { ...prevStats, speed, custom },
              combat: { ...prevCombat, ac },
            }),
          },
        );
        const updated = parseCharacterResponse(res);
        if (!updated) return;
        setCharacter(updated);
        setDraft(mapCharacterToLevel0Sheet(updated));
        onCharacterUpdated?.(updated);
        setError(null);
      } catch (e) {
        setError(formatError(e));
      }
    },
    [character, onCharacterUpdated],
  );

  const assignOwner = useCallback(
    async (ownerUserId: string) => {
      if (!dmUserId) return;
      const currentOwner = character.ownerUserId ?? dmUserId;
      if (ownerUserId === currentOwner) return;
      setSaving(true);
      setError(null);
      try {
        const res = await api<{ character: Character } | Character>(
          `/characters/${character.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ ownerUserId }),
          },
        );
        const updated = parseCharacterResponse(res);
        if (!updated) {
          throw new Error('Assign succeeded but no character was returned');
        }
        setCharacter(updated);
        setDraft(mapCharacterToLevel0Sheet(updated));
        onCharacterUpdated?.(updated);
      } catch (e) {
        setError(formatError(e));
      } finally {
        setSaving(false);
      }
    },
    [character.id, character.ownerUserId, dmUserId, onCharacterUpdated],
  );

  const handleEquipmentSaved = (updated: Character) => {
    setCharacter(updated);
    setDraft(mapCharacterToLevel0Sheet(updated));
    onCharacterUpdated?.(updated);
  };

  const applyArmorSelection = (patch: {
    selectedArmorId?: string;
    selectedShieldId?: string;
  }) => {
    const next = {
      ...draft,
      selectedArmorId: patch.selectedArmorId ?? draft.selectedArmorId ?? NO_EQUIP_ID,
      selectedShieldId: patch.selectedShieldId ?? draft.selectedShieldId ?? NO_EQUIP_ID,
    };
    const derived = deriveArmorOnSheet(next);
    setDraft({ ...next, ...derived });
    void persistArmorLoadout(
      next.selectedArmorId ?? NO_EQUIP_ID,
      next.selectedShieldId ?? NO_EQUIP_ID,
    );
  };

  return {
    character,
    draft,
    editing,
    saving,
    hpAdjusting,
    equipmentOpen,
    setEquipmentOpen,
    error,
    setError,
    isDead,
    vitalityLabel,
    canEdit,
    startEdit,
    cancelEdit,
    save,
    patchHp,
    persistSelectedWeapon,
    assignOwner,
    handleEquipmentSaved,
    applyArmorSelection,
    setDraft,
  };
}
