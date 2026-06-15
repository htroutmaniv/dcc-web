import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  getActiveLightItemId,
  getCharacterVitality,
  formatCharacterVitalityBadge,
  isActiveInPlay,
  isMonsterActive,
  isMonsterInPlay,
  isMonsterKilled,
  listLightSourceOptions,
  parseAttackOutcome,
  stripRollTargetTag,
  type GameInitiativeState,
  type GameMonsterInstance,
} from '@dcc-web/shared';
import { canExpendLightSource } from '../utils/consumables';
import type { Character } from '../types/game';
import type { DiceResult } from '../types/game';
import type { CombatRollKind } from '../utils/character-rolls';
import { getConsumableCounts, isUsingLightSource } from '../utils/consumables';
import {
  formatWeaponLabel,
  getWeaponItems,
  resolveSelectedWeaponId,
} from '../utils/weapons';

export type CombatTargetOption = {
  type: 'monster' | 'npc';
  id: string;
  label: string;
  ac: number;
};

interface CharacterListItemProps {
  character: Character;
  selected?: boolean;
  onSelect: () => void;
  onCombatRoll: (kind: CombatRollKind) => void;
  onPatchHp?: (hpCurrent: number) => void;
  canEditHp?: boolean;
  hpAdjusting?: boolean;
  onSelectWeapon?: (weaponId: string) => void;
  combatTargets?: CombatTargetOption[];
  attackTargetId?: string;
  onAttackTargetChange?: (targetId: string | null) => void;
  onOpenConsume?: (kind: 'food' | 'drink') => void;
  onSelectActiveLight?: (lightItemId: string | null) => void;
  onToggleLightLit?: (lit: boolean) => void;
  onExpendActiveLight?: () => void;
  consumableAdjusting?: boolean;
  canEditConsumables?: boolean;
  canToggleInPlay?: boolean;
  onToggleInPlay?: (active: boolean) => void;
  mapTokenVisible?: boolean;
  canToggleMapToken?: boolean;
  mapTokenBusy?: boolean;
  onToggleMapToken?: (visible: boolean) => void;
  initiative?: GameInitiativeState | null;
  initiativeActive?: boolean;
  isInitiativeTurn?: boolean;
  canEndTurn?: boolean;
  onEndTurn?: () => void;
  endingTurn?: boolean;
  rollingKind?: CombatRollKind | null;
  lastRoll?: DiceResult | null;
}

const ROLL_BUTTONS: { kind: CombatRollKind; label: string }[] = [
  { kind: 'initiative', label: 'Init' },
  { kind: 'toHit', label: 'Hit' },
  { kind: 'damage', label: 'Dmg' },
];

function shouldShowInitiativeQuickRoll(
  state: GameInitiativeState | null,
  characterId: string,
): boolean {
  if (!state?.active) return true;
  return !state.order.some(
    (entry) => entry.kind === 'character' && entry.characterId === characterId,
  );
}

export function buildCombatTargetOptions(
  monsters: GameMonsterInstance[],
  npcTokens: { id: string; label: string }[],
): CombatTargetOption[] {
  const out: CombatTargetOption[] = [];
  for (const m of monsters) {
    if (isMonsterKilled(m) || !isMonsterActive(m) || !isMonsterInPlay(m)) continue;
    out.push({
      type: 'monster',
      id: m.id,
      label: m.name,
      ac: m.ac,
    });
  }
  for (const t of npcTokens) {
    out.push({ type: 'npc', id: t.id, label: t.label, ac: 10 });
  }
  return out;
}

export function CharacterListItem({
  character,
  selected,
  onSelect,
  onCombatRoll,
  onPatchHp,
  canEditHp,
  hpAdjusting,
  onSelectWeapon,
  combatTargets = [],
  attackTargetId = '',
  onAttackTargetChange,
  onOpenConsume,
  onSelectActiveLight,
  onToggleLightLit,
  onExpendActiveLight,
  consumableAdjusting,
  canEditConsumables,
  canToggleInPlay,
  onToggleInPlay,
  mapTokenVisible = false,
  canToggleMapToken = false,
  mapTokenBusy = false,
  onToggleMapToken,
  initiative,
  initiativeActive,
  isInitiativeTurn,
  canEndTurn,
  onEndTurn,
  endingTurn,
  rollingKind,
  lastRoll,
}: CharacterListItemProps) {
  const hpNum =
    typeof character.combat?.hpCurrent === 'number' ? character.combat.hpCurrent : null;
  const hpMaxNum =
    typeof character.combat?.hpMax === 'number' ? character.combat.hpMax : null;
  const hpCurrent = hpNum ?? '—';
  const hpMax = hpMaxNum ?? '—';
  const canAdjustHp = Boolean(canEditHp && onPatchHp && hpNum !== null && hpMaxNum !== null);
  const ac = character.combat?.ac ?? '—';
  const vitality = getCharacterVitality({
    level: character.level,
    status: character.status,
    combat: character.combat,
  });
  const vitalityLabel = formatCharacterVitalityBadge({
    level: character.level,
    status: character.status,
    combat: character.combat,
  });
  const isDead = vitality === 'dead' || character.status === 'dead';
  const isDying = vitality === 'dying';
  const hpColor = isDead ? 'error.main' : isDying ? 'warning.main' : 'text.secondary';
  const deadColor = 'error.main';
  const isRolling = rollingKind != null;
  const counts = getConsumableCounts(character);
  const activeLightId = getActiveLightItemId(character);
  const isLit = isUsingLightSource(character);
  const lightOptions = listLightSourceOptions(character.items ?? []);
  const expendCheck = activeLightId
    ? canExpendLightSource(character.items ?? [], activeLightId)
    : { ok: false as const, message: 'Select a light source' };
  const inPlay = isActiveInPlay(character);
  const showTurnHighlight = initiativeActive && isInitiativeTurn;
  const weapons = getWeaponItems(character);
  const selectedWeaponId = resolveSelectedWeaponId(character) ?? '';
  const showCombatTargets = initiativeActive && combatTargets.length > 0;
  const lastOutcome = lastRoll?.reason ? parseAttackOutcome(lastRoll.reason) : null;
  const visibleRollButtons = ROLL_BUTTONS.filter(
    ({ kind }) =>
      kind !== 'initiative' ||
      shouldShowInitiativeQuickRoll(initiative ?? null, character.id),
  );

  return (
    <Box
      sx={{
        borderRadius: 1,
        mb: 0.5,
        py: 1.25,
        px: 1.5,
        border: 2,
        borderColor: showTurnHighlight
          ? 'warning.main'
          : selected
            ? 'primary.main'
            : 'divider',
        bgcolor: showTurnHighlight
          ? 'rgba(201, 162, 39, 0.12)'
          : selected
            ? 'action.selected'
            : 'transparent',
        boxShadow: showTurnHighlight ? '0 0 12px rgba(201, 162, 39, 0.35)' : 'none',
      }}
    >
      <Box
        onClick={onSelect}
        sx={{ cursor: 'pointer', minWidth: 0 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <Typography
          variant="body1"
          fontWeight={600}
          noWrap
          sx={{ color: isDead ? deadColor : 'text.primary' }}
        >
          {character.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 0.5, color: hpColor }}
        >
          HP {hpCurrent}/{hpMax}
          {vitalityLabel && (
            <>
              <Box component="span" sx={{ mx: 1, opacity: 0.5 }}>
                ·
              </Box>
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
          <Box component="span" sx={{ mx: 1, opacity: 0.5 }}>
            ·
          </Box>
          AC {ac}
          {isLit && (
            <>
              <Box component="span" sx={{ mx: 1, opacity: 0.5 }}>
                ·
              </Box>
              <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>
                Lit
              </Box>
            </>
          )}
        </Typography>
      </Box>

      {canAdjustHp && (
        <Stack
          direction="row"
          spacing={0.25}
          alignItems="center"
          sx={{ mt: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="small"
            sx={{ minWidth: 24, px: 0.25, py: 0 }}
            disabled={hpAdjusting}
            onClick={() => onPatchHp!(hpNum! - 1)}
          >
            −
          </Button>
          <Typography variant="caption" sx={{ minWidth: 52, textAlign: 'center' }}>
            {hpNum}/{hpMaxNum}
          </Typography>
          <Button
            size="small"
            sx={{ minWidth: 24, px: 0.25, py: 0 }}
            disabled={hpAdjusting || hpNum! >= hpMaxNum!}
            onClick={() => onPatchHp!(hpNum! + 1)}
          >
            +
          </Button>
        </Stack>
      )}

      <Box sx={{ mt: 0.75 }} onClick={(e) => e.stopPropagation()}>
        <FormControlLabel
          sx={{ ml: 0, alignItems: 'center', display: 'flex' }}
          control={
            <Checkbox
              size="small"
              checked={inPlay}
              disabled={!canToggleInPlay || isDead || consumableAdjusting || hpAdjusting}
              onChange={(e) => onToggleInPlay?.(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              In play
            </Typography>
          }
        />
        {canToggleMapToken && (
          <FormControlLabel
            sx={{ ml: 0, alignItems: 'center', display: 'flex' }}
            control={
              <Checkbox
                size="small"
                checked={mapTokenVisible}
                disabled={mapTokenBusy || consumableAdjusting || hpAdjusting}
                onChange={(e) => onToggleMapToken?.(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Show on map
              </Typography>
            }
          />
        )}
        {showTurnHighlight && (
          <Typography
            variant="caption"
            sx={{ color: 'warning.main', fontWeight: 800, display: 'block', mb: 0.5 }}
          >
            Active turn
          </Typography>
        )}
        {canEndTurn && (
          <Button
            size="small"
            variant="contained"
            color="warning"
            fullWidth
            sx={{ mb: 0.75, py: 0.35, fontSize: '0.72rem' }}
            disabled={endingTurn}
            onClick={() => onEndTurn?.()}
          >
            {endingTurn ? <CircularProgress size={14} color="inherit" /> : 'End turn'}
          </Button>
        )}
      </Box>

      {weapons.length > 0 && (
        <Box sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <FormControl size="small" fullWidth disabled={consumableAdjusting}>
            <InputLabel id={`weapon-${character.id}`}>Weapon</InputLabel>
            <Select
              labelId={`weapon-${character.id}`}
              label="Weapon"
              value={selectedWeaponId}
              onChange={(e) => onSelectWeapon?.(e.target.value)}
            >
              {weapons.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {formatWeaponLabel(w)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {showCombatTargets && (
        <Box sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <FormControl size="small" fullWidth disabled={isRolling}>
            <InputLabel id={`atk-tgt-${character.id}`}>Attack target</InputLabel>
            <Select
              labelId={`atk-tgt-${character.id}`}
              label="Attack target"
              value={attackTargetId}
              onChange={(e) => onAttackTargetChange?.(e.target.value || null)}
            >
              <MenuItem value="">
                <em>Select target</em>
              </MenuItem>
              {combatTargets.map((t) => (
                <MenuItem key={`${t.type}-${t.id}`} value={`${t.type}:${t.id}`}>
                  {t.label} (AC {t.ac})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Box sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Food {counts.food} · Drink {counts.drink} · Fuel {counts.fuel}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={!canEditConsumables || consumableAdjusting || counts.food <= 0}
            onClick={() => onOpenConsume?.('food')}
            sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
          >
            Eat
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!canEditConsumables || consumableAdjusting || counts.drink <= 0}
            onClick={() => onOpenConsume?.('drink')}
            sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
          >
            Drink
          </Button>
        </Stack>
        <FormControl
          size="small"
          fullWidth
          disabled={!canEditConsumables || consumableAdjusting || lightOptions.length === 0}
          sx={{ mb: 0.5 }}
        >
          <InputLabel id={`light-${character.id}`}>Light source</InputLabel>
          <Select
            labelId={`light-${character.id}`}
            label="Light source"
            value={activeLightId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onSelectActiveLight?.(v === '' ? null : v);
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {lightOptions.map((opt) => (
              <MenuItem key={opt.item.id} value={opt.item.id}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControlLabel
            sx={{ ml: 0, mr: 0 }}
            control={
              <Checkbox
                size="small"
                checked={isLit}
                disabled={
                  !canEditConsumables ||
                  consumableAdjusting ||
                  !activeLightId
                }
                onChange={(e) => onToggleLightLit?.(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Lit
              </Typography>
            }
          />
          <Button
            size="small"
            variant="outlined"
            color="warning"
            disabled={
              !canEditConsumables ||
              consumableAdjusting ||
              !activeLightId ||
              !expendCheck.ok
            }
            onClick={() => onExpendActiveLight?.()}
            sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
            title={expendCheck.ok ? undefined : expendCheck.message}
          >
            Expend
          </Button>
        </Stack>
        {lightOptions.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Add a torch or lantern + fuel in Manage equipment.
          </Typography>
        )}
        {activeLightId && !expendCheck.ok && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {expendCheck.message}
          </Typography>
        )}
      </Box>

      <Stack
        direction="row"
        spacing={0.5}
        sx={{ mt: 1 }}
        flexWrap="wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {visibleRollButtons.map(({ kind, label }) => {
          const needsTarget =
            initiativeActive && (kind === 'toHit' || kind === 'damage') && combatTargets.length > 0;
          const disabled =
            isRolling || (needsTarget && !attackTargetId);
          return (
            <Button
              key={kind}
              size="small"
              variant="outlined"
              disabled={disabled}
              onClick={() => onCombatRoll(kind)}
              sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
            >
              {rollingKind === kind ? <CircularProgress size={12} /> : label}
            </Button>
          );
        })}
      </Stack>

      {lastRoll && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            display: 'block',
            color:
              lastOutcome === 'hit'
                ? 'success.main'
                : lastOutcome === 'miss'
                  ? 'error.main'
                  : 'success.main',
          }}
        >
          <strong>{lastRoll.total}</strong> ({stripRollTargetTag(lastRoll.reason ?? '') || lastRoll.notation})
          {lastOutcome === 'hit' && (
            <Box component="span" sx={{ ml: 0.5, fontWeight: 800 }}>
              Success
            </Box>
          )}
          {lastOutcome === 'miss' && (
            <Box component="span" sx={{ ml: 0.5, fontWeight: 800 }}>
              Failure
            </Box>
          )}
        </Typography>
      )}
    </Box>
  );
}
