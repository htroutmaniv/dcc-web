import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { Character, User } from '../../types/game';
import {
  isLevel0Sheet,
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
import { getActiveWeapon, weaponStatsFromItem } from '../../utils/weapons';
import type { GameMonsterInstance } from '@dcc-web/shared';
import {
  formatCharacterVitalityBadge,
  getCharacterVitality,
} from '@dcc-web/shared';
import type { TransferInventoryResult } from '../inventory/TransferItemDialog';
import { EquipmentManagerDialog } from './EquipmentManagerDialog';
import { Level0CharacterSheet } from './Level0CharacterSheet';

interface CharacterSheetViewProps {
  character: Character;
  gameId?: string;
  partyCharacters?: Character[];
  partyMonsters?: GameMonsterInstance[];
  onInventoryTransferred?: (result: TransferInventoryResult) => void;
  onClose: () => void;
  /** Called after a successful save; optional for backwards compatibility */
  onCharacterUpdated?: (character: Character) => void;
  onMonsterUpdated?: (monster: GameMonsterInstance) => void;
  onRevive?: (characterId: string) => void;
  onArchive?: (characterId: string) => void;
  onMarkDead?: (characterId: string) => void;
  isDm?: boolean;
  players?: User[];
  dmUserId?: string;
}

export function CharacterSheetView({
  character: characterProp,
  gameId,
  partyCharacters = [],
  partyMonsters = [],
  onInventoryTransferred,
  onClose,
  onCharacterUpdated,
  onMonsterUpdated,
  onRevive,
  onArchive,
  onMarkDead,
  isDm,
  players = [],
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

  const canEdit =
    isDm || (user != null && character.ownerUserId === user.id);

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
      const updated =
        res && typeof res === 'object' && 'character' in res
          ? res.character
          : (res as Character);
      if (!updated?.id) {
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
        const updated =
          res && typeof res === 'object' && 'character' in res
            ? res.character
            : (res as Character);
        if (!updated?.id) throw new Error('HP update failed');
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
        const updated =
          res && typeof res === 'object' && 'character' in res
            ? res.character
            : (res as Character);
        if (!updated?.id) return;
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
        const updated =
          res && typeof res === 'object' && 'character' in res
            ? res.character
            : (res as Character);
        if (!updated?.id) return;
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
        const updated =
          res && typeof res === 'object' && 'character' in res
            ? res.character
            : (res as Character);
        if (!updated?.id) {
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
    void persistArmorLoadout(next.selectedArmorId ?? NO_EQUIP_ID, next.selectedShieldId ?? NO_EQUIP_ID);
  };

  const sheet = (
    <Level0CharacterSheet
      data={draft}
      editing={editing}
      onChange={setDraft}
      onOpenEquipment={() => setEquipmentOpen(true)}
      onSelectWeapon={(weaponId) => {
        setDraft((d) => ({ ...d, selectedWeaponId: weaponId }));
        void persistSelectedWeapon(weaponId);
      }}
      onSelectArmor={(armorId) => {
        applyArmorSelection({ selectedArmorId: armorId || NO_EQUIP_ID });
      }}
      onSelectShield={(shieldId) => {
        applyArmorSelection({ selectedShieldId: shieldId || NO_EQUIP_ID });
      }}
      canEditHp={canEdit}
      onPatchHp={(hp) => void patchHp(hp)}
      hpAdjusting={hpAdjusting}
    />
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: '#12100e',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              fontFamily="Cinzel, serif"
              sx={{ color: isDead ? 'error.main' : 'text.primary' }}
            >
              {character.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: isDead ? 'error.main' : 'text.secondary' }}
            >
              HP {character.combat?.hpCurrent ?? '—'} / max {character.combat?.hpMax ?? '—'}
              {vitalityLabel && (
                <>
                  {' · '}
                  <Box
                    component="span"
                    sx={{
                      color: isDead ? 'error.main' : 'warning.main',
                      fontWeight: 700,
                    }}
                  >
                    {vitalityLabel}
                  </Box>
                </>
              )}
              {' · '}
              AC {character.combat?.ac ?? '—'}
              {(() => {
                const w = getActiveWeapon(character);
                if (!w) return null;
                const { attackBonus, damage } = weaponStatsFromItem(w);
                const ab =
                  attackBonus !== 0
                    ? ` ${attackBonus >= 0 ? '+' : ''}${attackBonus}`
                    : '';
                return (
                  <>
                    {' · '}
                    {w.name} ({damage}{ab} atk)
                  </>
                );
              })()}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {canEdit && !editing && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={startEdit}
              >
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={
                    saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
                  }
                  onClick={() => void save()}
                  disabled={saving}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<CancelIcon />}
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              size="small"
              startIcon={<CloseIcon />}
              onClick={onClose}
              color="inherit"
              disabled={saving}
            >
              Back to map
            </Button>
          </Stack>
        </Box>

        {isDm && dmUserId && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" alignItems="center">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: 'center', mr: 0.5 }}
            >
              DM:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="char-assign-label">Assigned to</InputLabel>
              <Select
                labelId="char-assign-label"
                label="Assigned to"
                value={character.ownerUserId ?? dmUserId}
                onChange={(e) => void assignOwner(e.target.value)}
                disabled={saving || editing}
              >
                <MenuItem value={dmUserId}>NPC (DM)</MenuItem>
                {players
                  .filter((p) => p.id !== dmUserId)
                  .map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.displayName}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {character.status === 'dead' && onRevive && (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => onRevive(character.id)}
                disabled={saving || editing}
              >
                Revive
              </Button>
            )}
            {character.status === 'alive' && onMarkDead && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                onClick={() => onMarkDead(character.id)}
                disabled={saving || editing}
              >
                Kill
              </Button>
            )}
            {onArchive && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => onArchive(character.id)}
                disabled={saving || editing}
              >
                Remove from game
              </Button>
            )}
          </Stack>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: { xs: 1, sm: 2, md: 3 },
          display: 'flex',
          justifyContent: 'center',
          bgcolor: '#3a342c',
        }}
      >
        {isLevel0Sheet(character) ? (
          sheet
        ) : (
          <Box sx={{ maxWidth: 960, width: '100%' }}>
            <Typography variant="h6" gutterBottom fontFamily="Cinzel, serif" color="text.primary">
              {character.name}
            </Typography>
            <Typography color="text.secondary" paragraph>
              Level {character.level} {character.className} — class layout coming soon.
            </Typography>
            {sheet}
          </Box>
        )}
      </Box>

      <EquipmentManagerDialog
        open={equipmentOpen}
        character={character}
        canEdit={canEdit}
        gameId={gameId}
        partyCharacters={partyCharacters}
        partyMonsters={partyMonsters}
        onInventoryTransferred={(result) => {
          onInventoryTransferred?.(result);
          if (result.sourceMonster) onMonsterUpdated?.(result.sourceMonster);
          if (result.targetMonster) onMonsterUpdated?.(result.targetMonster);
        }}
        onClose={() => setEquipmentOpen(false)}
        onSaved={handleEquipmentSaved}
      />
    </Box>
  );
}
