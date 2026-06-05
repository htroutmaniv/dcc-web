import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CasinoIcon from '@mui/icons-material/Casino';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  buildDiceNotation,
  DCC_DIE_SIDES,
  totalDiceInTray,
  type DiceTrayCounts,
} from '@dcc-web/shared';
interface DiceTrayProps {
  counts: DiceTrayCounts;
  onCountsChange: (counts: DiceTrayCounts) => void;
  onRoll: () => void;
  onReset: () => void;
  rolling?: boolean;
  /** Hide intro line when embedded in the dice tab layout. */
  compact?: boolean;
}

function DieRow({
  sides,
  count,
  disabled,
  onDelta,
}: {
  sides: number;
  count: number;
  disabled?: boolean;
  onDelta: (delta: number) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{ minWidth: 36, fontFamily: 'monospace' }}
      >
        d{sides}
      </Typography>
      <IconButton
        size="small"
        disabled={disabled || count <= 0}
        onClick={() => onDelta(-1)}
        aria-label={`Remove d${sides}`}
        sx={{ p: 0.25 }}
      >
        <RemoveIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{ minWidth: 20, textAlign: 'center' }}
      >
        {count}
      </Typography>
      <IconButton
        size="small"
        disabled={disabled || count >= 100}
        onClick={() => onDelta(1)}
        aria-label={`Add d${sides}`}
        sx={{ p: 0.25 }}
      >
        <AddIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Stack>
  );
}

export function DiceTray({
  counts,
  onCountsChange,
  onRoll,
  onReset,
  rolling = false,
  compact = false,
}: DiceTrayProps) {
  const notation = buildDiceNotation(counts);
  const hasDice = totalDiceInTray(counts) > 0;

  const adjust = (sides: number, delta: number) => {
    const next = { ...counts, [sides]: Math.max(0, Math.min(100, (counts[sides] ?? 0) + delta)) };
    onCountsChange(next);
  };

  return (
    <Box>
      {!compact && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          DCC dice — set counts, then roll on the server.
        </Typography>
      )}

      <Stack spacing={0.25} sx={{ mb: compact ? 1 : 1.5 }}>
        {DCC_DIE_SIDES.map((sides) => (
          <DieRow
            key={sides}
            sides={sides}
            count={counts[sides] ?? 0}
            disabled={rolling}
            onDelta={(delta) => adjust(sides, delta)}
          />
        ))}
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 1, fontFamily: 'monospace' }}
      >
        {notation ?? 'Select dice to roll'}
      </Typography>

      <Stack direction="row" spacing={1}>
        <Button
          fullWidth
          variant="contained"
          startIcon={rolling ? <CircularProgress size={18} color="inherit" /> : <CasinoIcon />}
          onClick={onRoll}
          disabled={rolling || !hasDice}
        >
          Roll
        </Button>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
          disabled={rolling}
          aria-label="Reset dice counts"
        >
          Reset
        </Button>
      </Stack>
    </Box>
  );
}
