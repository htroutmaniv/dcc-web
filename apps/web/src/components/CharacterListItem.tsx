import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { isActiveInPlay, type ConsumableTrackKind } from '@dcc-web/shared';
import type { Character, DiceResult } from '../types/game';
import type { CombatRollKind } from '../utils/combat-rolls';
import { getConsumableCounts, isUsingLightSource } from '../utils/consumables';

interface CharacterListItemProps {
  character: Character;
  selected?: boolean;
  onSelect: () => void;
  onCombatRoll: (kind: CombatRollKind) => void;
  onAdjustConsumable?: (kind: ConsumableTrackKind, delta: number) => void;
  onToggleLightSource?: (using: boolean) => void;
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

const TRACKERS: { kind: ConsumableTrackKind; label: string; short: string }[] = [
  { kind: 'food', label: 'Rations', short: 'Food' },
  { kind: 'drink', label: 'Water', short: 'Drink' },
  { kind: 'light', label: 'Light sources', short: 'Light' },
];

function ConsumableRow({
  label,
  value,
  disabled,
  onDelta,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onDelta: (delta: number) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ flex: 1, minWidth: 52 }} noWrap>
        {label}
      </Typography>
      <IconButton
        size="small"
        disabled={disabled || value <= 0}
        onClick={() => onDelta(-1)}
        sx={{ p: 0.25 }}
        aria-label={`Decrease ${label}`}
      >
        <RemoveIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 16, textAlign: 'center' }}>
        {value}
      </Typography>
      <IconButton
        size="small"
        disabled={disabled}
        onClick={() => onDelta(1)}
        sx={{ p: 0.25 }}
        aria-label={`Increase ${label}`}
      >
        <AddIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
  );
}

function LightSourceRow({
  label,
  value,
  using,
  disabled,
  onDelta,
  onToggleUsing,
}: {
  label: string;
  value: number;
  using: boolean;
  disabled?: boolean;
  onDelta: (delta: number) => void;
  onToggleUsing: (using: boolean) => void;
}) {
  return (
    <Box>
      <ConsumableRow
        label={label}
        value={value}
        disabled={disabled}
        onDelta={onDelta}
      />
      <FormControlLabel
        sx={{ ml: 0, mt: -0.25, alignItems: 'center' }}
        control={
          <Checkbox
            size="small"
            checked={using}
            disabled={disabled || value <= 0}
            onChange={(e) => onToggleUsing(e.target.checked)}
            sx={{ py: 0.25 }}
          />
        }
        label={
          <Typography variant="caption" color="text.secondary">
            Using light source
          </Typography>
        }
      />
    </Box>
  );
}

export function CharacterListItem({
  character,
  selected,
  onSelect,
  onCombatRoll,
  onAdjustConsumable,
  onToggleLightSource,
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
  const lightSourceActive = isUsingLightSource(character);
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
          {lightSourceActive && counts.light > 0 && (
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
        <Stack spacing={0.5}>
          {TRACKERS.map(({ kind, label }) =>
            kind === 'light' ? (
              <LightSourceRow
                key={kind}
                label={label}
                value={counts.light}
                using={lightSourceActive}
                disabled={!canEditConsumables || consumableAdjusting}
                onDelta={(delta) => onAdjustConsumable?.(kind, delta)}
                onToggleUsing={(checked) => onToggleLightSource?.(checked)}
              />
            ) : (
              <ConsumableRow
                key={kind}
                label={label}
                value={counts[kind]}
                disabled={!canEditConsumables || consumableAdjusting}
                onDelta={(delta) => onAdjustConsumable?.(kind, delta)}
              />
            ),
          )}
        </Stack>
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
