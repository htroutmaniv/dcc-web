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
  isActiveInPlay,
  listLightSourceOptions,
} from '@dcc-web/shared';
import { canExpendLightSource } from '../utils/consumables';
import type { Character, DiceResult } from '../types/game';
import type { CombatRollKind } from '../utils/combat-rolls';
import { getConsumableCounts, isUsingLightSource } from '../utils/consumables';

interface CharacterListItemProps {
  character: Character;
  selected?: boolean;
  onSelect: () => void;
  onCombatRoll: (kind: CombatRollKind) => void;
  onOpenConsume?: (kind: 'food' | 'drink') => void;
  onSelectActiveLight?: (lightItemId: string | null) => void;
  onToggleLightLit?: (lit: boolean) => void;
  onExpendActiveLight?: () => void;
  consumableAdjusting?: boolean;
  canEditConsumables?: boolean;
  canToggleInPlay?: boolean;
  onToggleInPlay?: (active: boolean) => void;
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

export function CharacterListItem({
  character,
  selected,
  onSelect,
  onCombatRoll,
  onOpenConsume,
  onSelectActiveLight,
  onToggleLightLit,
  onExpendActiveLight,
  consumableAdjusting,
  canEditConsumables,
  canToggleInPlay,
  onToggleInPlay,
  initiativeActive,
  isInitiativeTurn,
  canEndTurn,
  onEndTurn,
  endingTurn,
  rollingKind,
  lastRoll,
}: CharacterListItemProps) {
  const hpCurrent = character.combat?.hpCurrent ?? '—';
  const hpMax = character.combat?.hpMax ?? '—';
  const ac = character.combat?.ac ?? '—';
  const isDead = character.status === 'dead';
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
          sx={{ mt: 0.5, color: isDead ? deadColor : 'text.secondary' }}
        >
          HP {hpCurrent}/{hpMax}
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

      <Box sx={{ mt: 0.75 }} onClick={(e) => e.stopPropagation()}>
        <FormControlLabel
          sx={{ ml: 0, alignItems: 'center', display: 'flex' }}
          control={
            <Checkbox
              size="small"
              checked={inPlay}
              disabled={!canToggleInPlay || isDead || consumableAdjusting}
              onChange={(e) => onToggleInPlay?.(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              In play
            </Typography>
          }
        />
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
        {ROLL_BUTTONS.map(({ kind, label }) => (
          <Button
            key={kind}
            size="small"
            variant="outlined"
            disabled={isRolling}
            onClick={() => onCombatRoll(kind)}
            sx={{ minWidth: 0, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
          >
            {rollingKind === kind ? <CircularProgress size={12} /> : label}
          </Button>
        ))}
      </Stack>

      {lastRoll && (
        <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
          <strong>{lastRoll.total}</strong> ({lastRoll.notation})
        </Typography>
      )}
    </Box>
  );
}
