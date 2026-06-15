import { Divider, Stack, Typography } from '@mui/material';
import type { GameInitiativeState, GameMonsterInstance, GamePatch } from '@dcc-web/shared';
import { MonsterSpawnForm } from './monster-panel/MonsterSpawnForm';
import { MonsterSpawnedList } from './monster-panel/MonsterSpawnedList';
import { useMonsterPanelState } from './monster-panel/useMonsterPanelState';

interface MonsterPanelProps {
  gameId: string;
  monsters: GameMonsterInstance[];
  busy?: boolean;
  handleMonsterUpdated: (monster: GameMonsterInstance) => void;
  applyGamePatch: (patch: GamePatch) => void;
  onInitiativeChange?: (initiative: GameInitiativeState | null) => void;
  onError?: (message: string | null) => void;
}

export function MonsterPanel(props: MonsterPanelProps) {
  const state = useMonsterPanelState(props);

  return (
    <Stack spacing={2}>
      <MonsterSpawnForm {...state} />
      <Divider />
      <Typography variant="subtitle2">Spawned ({props.monsters.length})</Typography>
      <MonsterSpawnedList
        monsters={props.monsters}
        disabled={state.disabled}
        onRemove={state.removeMonster}
        onKill={state.killMonster}
        onPatchHp={state.patchHp}
        onToggleInPlay={state.toggleInPlay}
      />
    </Stack>
  );
}
