import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import StopIcon from '@mui/icons-material/Stop';
import PestControlIcon from '@mui/icons-material/PestControl';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryIcon from '@mui/icons-material/History';
import type { GameInitiativeState, GameMonsterInstance } from '@dcc-web/shared';
import { MonsterQuickMenu, type MonsterCombatRollKind } from './MonsterQuickMenu';
import { MonsterPanel } from './MonsterPanel';
import { DmAuditPane } from './DmAuditPane';
import type { Character } from '../types/game';

export type DmPanelTab = 'controls' | 'monsters' | 'audit';

const PANEL_WIDTH = { xs: 320, sm: 420 } as const;

interface DmControlPanelProps {
  gameId: string;
  initiative: GameInitiativeState | null;
  onStartInitiative: () => void;
  onAdvanceTurn: () => void;
  onEndInitiative: () => void;
  monstersVisibleOnMap?: boolean;
  onToggleMonstersVisibleOnMap?: () => void;
  sharedMonsterInitiative?: boolean;
  onToggleSharedMonsterInitiative?: () => void;
  hideMonsterAcInRollLog?: boolean;
  onToggleHideMonsterAcInRollLog?: () => void;
  busy?: boolean;
  monsters: GameMonsterInstance[];
  characters: Character[];
  monsterTargetById: Record<string, string>;
  sheetMonsterId?: string | null;
  onMonsterTargetChange: (monsterId: string, characterId: string | null) => void;
  onPatchMonsterHp: (monster: GameMonsterInstance, hpCurrent: number) => void;
  onKillMonster: (monster: GameMonsterInstance) => void;
  onDeleteMonster: (monsterId: string) => void;
  onRollMonsterAttack: (monster: GameMonsterInstance, target: Character) => void;
  onMonsterCombatRoll: (monster: GameMonsterInstance, kind: MonsterCombatRollKind) => void;
  onToggleMonsterInPlay: (monster: GameMonsterInstance, active: boolean) => void;
  rollingMonsterId?: string | null;
  rollingMonsterKind?: MonsterCombatRollKind | null;
  onOpenMonsterSheet: (monsterId: string) => void;
  lastAttackSummary?: string | null;
  onMonstersChange: (monsters: GameMonsterInstance[]) => void;
  onMonsterInitiativeChange?: (initiative: GameInitiativeState | null) => void;
  onMonsterPanelError?: (message: string | null) => void;
}

export function DmControlPanel({
  gameId,
  initiative,
  onStartInitiative,
  onAdvanceTurn,
  onEndInitiative,
  monstersVisibleOnMap = false,
  onToggleMonstersVisibleOnMap,
  sharedMonsterInitiative = false,
  onToggleSharedMonsterInitiative,
  hideMonsterAcInRollLog = false,
  onToggleHideMonsterAcInRollLog,
  busy = false,
  monsters,
  characters,
  monsterTargetById,
  sheetMonsterId,
  onMonsterTargetChange,
  onPatchMonsterHp,
  onKillMonster,
  onDeleteMonster,
  onRollMonsterAttack,
  onMonsterCombatRoll,
  onToggleMonsterInPlay,
  rollingMonsterId,
  rollingMonsterKind,
  onOpenMonsterSheet,
  lastAttackSummary,
  onMonstersChange,
  onMonsterInitiativeChange,
  onMonsterPanelError,
}: DmControlPanelProps) {
  const [tab, setTab] = useState<DmPanelTab>('controls');
  const active = initiative?.active ?? false;

  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value as DmPanelTab)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <Tab
          icon={<GavelIcon />}
          iconPosition="start"
          label="Controls"
          value="controls"
        />
        <Tab
          icon={<PestControlIcon />}
          iconPosition="start"
          label="Monsters"
          value="monsters"
        />
        <Tab
          icon={<HistoryIcon />}
          iconPosition="start"
          label="Audit"
          value="audit"
        />
      </Tabs>

      {tab === 'controls' && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={monstersVisibleOnMap}
                    onChange={() => onToggleMonstersVisibleOnMap?.()}
                    disabled={busy || !onToggleMonstersVisibleOnMap}
                  />
                }
                label={
                  <Typography variant="body2" fontSize="0.8rem">
                    Monsters visible on map
                  </Typography>
                }
                sx={{ ml: 0, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={sharedMonsterInitiative}
                    onChange={() => onToggleSharedMonsterInitiative?.()}
                    disabled={busy || !onToggleSharedMonsterInitiative}
                  />
                }
                label={
                  <Typography variant="body2" fontSize="0.8rem">
                    Shared monster initiative
                  </Typography>
                }
                sx={{ ml: 0, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={hideMonsterAcInRollLog}
                    onChange={() => onToggleHideMonsterAcInRollLog?.()}
                    disabled={busy || !onToggleHideMonsterAcInRollLog}
                  />
                }
                label={
                  <Typography variant="body2" fontSize="0.8rem">
                    Hide monster AC in roll log
                  </Typography>
                }
                sx={{ ml: 0, alignItems: 'flex-start' }}
              />
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ flex: 1, minHeight: 0, p: 1.5, display: 'flex', flexDirection: 'column' }}>
            <MonsterQuickMenu
              monsters={monsters}
              characters={characters}
              initiative={initiative}
              sharedMonsterInitiative={sharedMonsterInitiative}
              monsterTargetById={monsterTargetById}
              sheetMonsterId={sheetMonsterId}
              onMonsterTargetChange={onMonsterTargetChange}
              onPatchHp={onPatchMonsterHp}
              onKillMonster={onKillMonster}
              onDeleteMonster={onDeleteMonster}
              onToggleInPlay={onToggleMonsterInPlay}
              onCombatRoll={onMonsterCombatRoll}
              onRollAttack={onRollMonsterAttack}
              onOpenSheet={onOpenMonsterSheet}
              busy={busy}
              rollingMonsterId={rollingMonsterId}
              rollingMonsterKind={rollingMonsterKind}
              lastAttackSummary={lastAttackSummary}
            />
          </Box>
        </Box>
      )}

      {tab === 'monsters' && (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
          <MonsterPanel
            gameId={gameId}
            monsters={monsters}
            busy={busy}
            onMonstersChange={onMonstersChange}
            onInitiativeChange={onMonsterInitiativeChange}
            onError={onMonsterPanelError}
          />
        </Box>
      )}

      {tab === 'audit' && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 1.5, flexShrink: 0 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Audit log
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Recent DM-sensitive actions (last 100)
            </Typography>
          </Box>
          <DmAuditPane gameId={gameId} />
        </Box>
      )}
    </Box>
  );
}
