import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  formatMonsterSummary,
  isMonsterInPlay,
  isMonsterKilled,
  type GameMonsterInstance,
} from '@dcc-web/shared';

type MonsterSpawnedListProps = {
  monsters: GameMonsterInstance[];
  disabled: boolean;
  onRemove: (monsterId: string) => void;
  onKill: (monster: GameMonsterInstance) => void;
  onPatchHp: (monster: GameMonsterInstance, hpCurrent: number) => void;
  onToggleInPlay: (monster: GameMonsterInstance, active: boolean) => void;
};

export function MonsterSpawnedList({
  monsters,
  disabled,
  onRemove,
  onKill,
  onPatchHp,
  onToggleInPlay,
}: MonsterSpawnedListProps) {
  if (monsters.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No monsters spawned yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {monsters.map((m) => (
        <Box
          key={m.id}
          sx={{
            p: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={700} noWrap title={m.name}>
                {m.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {formatMonsterSummary(m)} · init {m.initMod >= 0 ? '+' : ''}
                {m.initMod}
              </Typography>
            </Box>
            <IconButton
              size="small"
              color="error"
              onClick={() => void onRemove(m.id)}
              disabled={disabled}
              aria-label="Remove"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }} flexWrap="wrap">
            {!isMonsterKilled(m) && (
              <FormControlLabel
                sx={{ mr: 0.5 }}
                control={
                  <Checkbox
                    size="small"
                    checked={isMonsterInPlay(m)}
                    onChange={(e) => void onToggleInPlay(m, e.target.checked)}
                    disabled={disabled}
                  />
                }
                label={
                  <Typography variant="caption" color="text.secondary">
                    In play
                  </Typography>
                }
              />
            )}
            {!isMonsterKilled(m) ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={disabled}
                onClick={() => void onKill(m)}
                sx={{ fontSize: '0.7rem' }}
              >
                Kill
              </Button>
            ) : (
              <Typography variant="caption" color="error.main" fontWeight={600}>
                Slain
              </Typography>
            )}
            <Button
              size="small"
              variant="outlined"
              sx={{ minWidth: 28, px: 0.5 }}
              disabled={disabled}
              onClick={() => void onPatchHp(m, m.hpCurrent - 1)}
            >
              −
            </Button>
            <Typography variant="caption" sx={{ minWidth: 48, textAlign: 'center' }}>
              {m.hpCurrent}/{m.hpMax}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              sx={{ minWidth: 28, px: 0.5 }}
              disabled={disabled || m.hpCurrent >= m.hpMax}
              onClick={() => void onPatchHp(m, Math.min(m.hpMax, m.hpCurrent + 1))}
            >
              +
            </Button>
            {isMonsterKilled(m) && (
              <Typography variant="caption" color="text.secondary">
                {(m.items?.length ?? 0) > 0 ? `${m.items!.length} loot item(s)` : 'No loot'}
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
