import { useMemo } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  formatMonsterSummary,
  isActiveInPlay,
  type GameInitiativeState,
  type GameMonsterInstance,
} from '@dcc-web/shared';
import type { Character } from '../types/game';

interface MonsterQuickMenuProps {
  monsters: GameMonsterInstance[];
  characters: Character[];
  initiative: GameInitiativeState | null;
  selectedMonsterId: string | null;
  attackTargetId: string | null;
  onSelectMonster: (id: string | null) => void;
  onAttackTargetChange: (characterId: string | null) => void;
  onPatchHp: (monster: GameMonsterInstance, hpCurrent: number) => void;
  onDeleteMonster: (monsterId: string) => void;
  onRollAttack: (monster: GameMonsterInstance, target: Character) => void;
  onOpenSheet?: (monsterId: string) => void;
  busy?: boolean;
  lastAttackRoll?: string | null;
}

export function MonsterQuickMenu({
  monsters,
  characters,
  initiative,
  selectedMonsterId,
  attackTargetId,
  onSelectMonster,
  onAttackTargetChange,
  onPatchHp,
  onDeleteMonster,
  onRollAttack,
  onOpenSheet,
  busy,
  lastAttackRoll,
}: MonsterQuickMenuProps) {
  const livingMonsters = monsters.filter((m) => m.hpCurrent > 0);
  const targets = useMemo(
    () =>
      characters.filter(
        (c) =>
          c.status === 'alive' &&
          isActiveInPlay({
            status: c.status,
            stats: { custom: c.stats?.custom as Record<string, unknown> | undefined },
          }),
      ),
    [characters],
  );

  const selectedMonster =
    livingMonsters.find((m) => m.id === selectedMonsterId) ?? livingMonsters[0] ?? null;
  const selectedTarget = targets.find((c) => c.id === attackTargetId) ?? null;

  const pickRandomTarget = () => {
    if (targets.length === 0) return;
    const pick = targets[Math.floor(Math.random() * targets.length)]!;
    onAttackTargetChange(pick.id);
  };

  const rollAttack = () => {
    if (!selectedMonster || !selectedTarget) return;
    onRollAttack(selectedMonster, selectedTarget);
  };

  const primaryAttack = selectedMonster?.sheet?.attacks[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        Monsters ({livingMonsters.length})
      </Typography>

      {initiative?.active && (
        <Typography variant="caption" color="warning.main">
          Shared monster initiative
        </Typography>
      )}

      <FormControl size="small" fullWidth disabled={targets.length === 0}>
        <InputLabel id="attack-target-label">Attack target</InputLabel>
        <Select
          labelId="attack-target-label"
          label="Attack target"
          value={attackTargetId ?? ''}
          onChange={(e) => onAttackTargetChange(e.target.value || null)}
        >
          <MenuItem value="">
            <em>Select PC</em>
          </MenuItem>
          {targets.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" spacing={0.5}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ShuffleIcon />}
          onClick={pickRandomTarget}
          disabled={busy || targets.length === 0}
          sx={{ flex: 1, fontSize: '0.7rem' }}
        >
          Random
        </Button>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          startIcon={<CasinoIcon />}
          onClick={rollAttack}
          disabled={busy || !selectedMonster || !selectedTarget}
          sx={{ flex: 1, fontSize: '0.7rem' }}
        >
          Attack
        </Button>
      </Stack>

      {lastAttackRoll && (
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          {lastAttackRoll}
        </Typography>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 80,
          maxHeight: 220,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        {livingMonsters.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>
            No active monsters
          </Typography>
        ) : (
          livingMonsters.map((m) => {
            const selected = m.id === (selectedMonsterId ?? livingMonsters[0]?.id);
            return (
              <Box
                key={m.id}
                onClick={() => onSelectMonster(m.id)}
                onDoubleClick={() => onOpenSheet?.(m.id)}
                title="Double-click for full sheet"
                sx={{
                  px: 1,
                  py: 0.75,
                  cursor: 'pointer',
                  bgcolor: selected ? 'action.selected' : 'transparent',
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={selected ? 700 : 500} noWrap>
                      {m.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {formatMonsterSummary(m)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMonster(m.id);
                    }}
                    disabled={busy}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.25}
                  alignItems="center"
                  sx={{ mt: 0.25 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="small"
                    sx={{ minWidth: 24, px: 0.25, py: 0 }}
                    disabled={busy || m.hpCurrent <= 0}
                    onClick={() => onPatchHp(m, m.hpCurrent - 1)}
                  >
                    −
                  </Button>
                  <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
                    {m.hpCurrent}/{m.hpMax}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ minWidth: 24, px: 0.25, py: 0 }}
                    disabled={busy || m.hpCurrent >= m.hpMax}
                    onClick={() => onPatchHp(m, m.hpCurrent + 1)}
                  >
                    +
                  </Button>
                </Stack>
              </Box>
            );
          })
        )}
      </Box>

      {selectedMonster && primaryAttack && (
        <Typography variant="caption" color="text.secondary">
          {primaryAttack.name}: +{primaryAttack.attackBonus} {primaryAttack.damage}
        </Typography>
      )}
    </Box>
  );
}
