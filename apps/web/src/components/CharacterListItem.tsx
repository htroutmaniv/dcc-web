import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import type { Character, DiceResult } from '../types/game';
import type { CombatRollKind } from '../utils/combat-rolls';

interface CharacterListItemProps {
  character: Character;
  selected?: boolean;
  onSelect: () => void;
  onCombatRoll: (kind: CombatRollKind) => void;
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
  rollingKind,
  lastRoll,
}: CharacterListItemProps) {
  const hpCurrent = character.combat?.hpCurrent ?? '—';
  const hpMax = character.combat?.hpMax ?? '—';
  const ac = character.combat?.ac ?? '—';
  const isDead = character.status === 'dead';
  const deadColor = 'error.main';
  const isRolling = rollingKind != null;

  return (
    <Box
      sx={{
        borderRadius: 1,
        mb: 0.5,
        py: 1.25,
        px: 1.5,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'transparent',
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
        </Typography>
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
