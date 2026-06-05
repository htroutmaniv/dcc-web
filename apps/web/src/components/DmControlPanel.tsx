import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import StopIcon from '@mui/icons-material/Stop';
import type { GameInitiativeState, GameMonsterInstance } from '@dcc-web/shared';
import { MonsterQuickMenu } from './MonsterQuickMenu';
import type { Character } from '../types/game';

interface DmControlPanelProps {
  initiative: GameInitiativeState | null;
  onStartInitiative: () => void;
  onAdvanceTurn: () => void;
  onEndInitiative: () => void;
  busy?: boolean;
  monsters: GameMonsterInstance[];
  characters: Character[];
  selectedMonsterId: string | null;
  attackTargetId: string | null;
  onSelectMonster: (id: string | null) => void;
  onAttackTargetChange: (id: string | null) => void;
  onPatchMonsterHp: (monster: GameMonsterInstance, hpCurrent: number) => void;
  onDeleteMonster: (monsterId: string) => void;
  onRollMonsterAttack: (monster: GameMonsterInstance, target: Character) => void;
  onOpenMonsterSheet?: (monsterId: string) => void;
  lastMonsterAttackRoll?: string | null;
}

export function DmControlPanel({
  initiative,
  onStartInitiative,
  onAdvanceTurn,
  onEndInitiative,
  busy = false,
  monsters,
  characters,
  selectedMonsterId,
  attackTargetId,
  onSelectMonster,
  onAttackTargetChange,
  onPatchMonsterHp,
  onDeleteMonster,
  onRollMonsterAttack,
  onOpenMonsterSheet,
  lastMonsterAttackRoll,
}: DmControlPanelProps) {
  const active = initiative?.active ?? false;

  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 1.5, flexShrink: 0 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          DM controls
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Combat & initiative
        </Typography>

        <Stack spacing={1} sx={{ mt: 0.5 }}>
          {!active && (
            <Button
              fullWidth
              variant="contained"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={onStartInitiative}
              disabled={busy}
            >
              Start initiative
            </Button>
          )}
          {active && (
            <>
              <Typography variant="caption" color="text.secondary">
                Round {initiative?.round ?? 1}
              </Typography>
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<SkipNextIcon />}
                onClick={onAdvanceTurn}
                disabled={busy}
              >
                Next turn
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<StopIcon />}
                onClick={onEndInitiative}
                disabled={busy}
              >
                End combat
              </Button>
            </>
          )}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, minHeight: 0, p: 1.5, display: 'flex', flexDirection: 'column' }}>
        <MonsterQuickMenu
          monsters={monsters}
          characters={characters}
          initiative={initiative}
          selectedMonsterId={selectedMonsterId}
          attackTargetId={attackTargetId}
          onSelectMonster={onSelectMonster}
          onAttackTargetChange={onAttackTargetChange}
          onPatchHp={onPatchMonsterHp}
          onDeleteMonster={onDeleteMonster}
          onRollAttack={onRollMonsterAttack}
          onOpenSheet={onOpenMonsterSheet}
          busy={busy}
          lastAttackRoll={lastMonsterAttackRoll}
        />
      </Box>
    </Box>
  );
}
