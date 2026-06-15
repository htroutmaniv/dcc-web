import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { GameInitiativeState, MapDrawTool, MapLayoutAnchor } from '@dcc-web/shared';
import type { Character, GameMonsterInstance } from '../../types/game';
import type { DiceRollLogEntry } from '../../types/dice-roll-log';
import type { TacticalGameMap, TacticalMapToken } from '../../types/map';
import type { TokenMapOverlay } from '../../types/token-overlay';
import type { MonsterCombatRollKind } from '../MonsterQuickMenu';
import { InitiativeOrderPanel } from '../InitiativeOrderPanel';

const DmControlPanel = lazy(() =>
  import('../DmControlPanel').then((m) => ({ default: m.DmControlPanel })),
);
const TacticalMap = lazy(() =>
  import('../TacticalMap').then((m) => ({ default: m.TacticalMap })),
);

export type GameStageProps = {
  gameId: string;
  isDm: boolean;
  userId?: string;
  initiative: GameInitiativeState | null;
  initiativeActive: boolean;
  initiativeBusy: boolean;
  monstersVisibleOnMap: boolean;
  hideMonsterAcInRollLog: boolean;
  sharedMonsterInitiative: boolean;
  onStartInitiative: () => void;
  onAdvanceTurn: () => void;
  onEndInitiative: () => void;
  onToggleMonstersVisibleOnMap: () => void;
  onToggleSharedMonsterInitiative: () => void;
  onToggleHideMonsterAcInRollLog: () => void;
  monsters: GameMonsterInstance[];
  characters: Character[];
  monsterTargetById: Record<string, string>;
  selectedMonsterId: string | null;
  onMonsterTargetChange: (monsterId: string, characterId: string | null) => void;
  onPatchMonsterHp: (monster: GameMonsterInstance, hp: number) => void;
  onKillMonster: (monster: GameMonsterInstance) => void;
  onDeleteMonster: (monsterId: string) => void;
  onRollMonsterAttack: (monster: GameMonsterInstance, target: Character) => void;
  onMonsterCombatRoll: (monster: GameMonsterInstance, kind: MonsterCombatRollKind) => void;
  onToggleMonsterInPlay: (monster: GameMonsterInstance, active: boolean) => void;
  monsterBusy: boolean;
  rollingMonsterId: string | null;
  rollingMonsterKind: MonsterCombatRollKind | null;
  onOpenMonsterSheet: (monsterId: string) => void;
  lastAttackSummary: string | null;
  handleMonsterUpdated: (monster: GameMonsterInstance) => void;
  applyGamePatch: (patch: import('@dcc-web/shared').GamePatch) => void;
  onMonsterInitiativeChange: (next: GameInitiativeState | null) => void;
  onMonsterPanelError: (message: string | null) => void;
  maps: TacticalGameMap[];
  activeMap: TacticalGameMap | null;
  activeMapId: string | null;
  mapBusy: boolean;
  drawTool: MapDrawTool;
  drawColor: string;
  drawStrokeWidth: number;
  onDrawToolChange: (tool: MapDrawTool) => void;
  onDrawColorChange: (color: string) => void;
  onDrawStrokeWidthChange: (width: number) => void;
  onImageScaleChange: (scale: number) => void;
  onSelectMap: (id: string) => void;
  onPrevMap: () => void;
  onNextMap: () => void;
  onAddMap: () => void;
  onDeleteMap: () => void;
  onToggleMapVisible: () => void;
  onGridPresetChange: (preset: 'tactical' | 'town' | 'regional') => void;
  onUploadImage: (file: File, gridW?: number, gridH?: number) => void;
  onRemoveImage: () => void;
  onRenameMap: (name: string) => void;
  onResetPlayerTokens: (anchor?: MapLayoutAnchor) => void;
  onResetMonsterTokens: (anchor?: MapLayoutAnchor) => void;
  onClearDrawings: () => void;
  onDrawingsChange: (drawings: TacticalGameMap['dmDrawings']) => void;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  canDragToken: (token: TacticalMapToken) => boolean;
  canLootToken: (token: TacticalMapToken) => boolean;
  isTokenInitiativeActive: (token: TacticalMapToken) => boolean;
  getTokenOverlay: (token: TacticalMapToken) => TokenMapOverlay | undefined;
  onTokenClick: (token: TacticalMapToken) => void;
  rollLog: DiceRollLogEntry[];
  onClearRollLog: () => void;
  onApplyDamageFromRoll?: (roll: DiceRollLogEntry) => void;
};

export function GameStage(props: GameStageProps) {
  const {
    gameId,
    isDm,
    initiative,
    initiativeActive,
    monstersVisibleOnMap,
    hideMonsterAcInRollLog,
    characters,
    monsters,
    maps,
    activeMap,
    activeMapId,
    rollLog,
  } = props;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'row',
        p: 2,
        gap: 0,
        overflow: 'hidden',
      }}
    >
      {isDm && (
        <Suspense fallback={<CircularProgress size={24} sx={{ m: 2 }} />}>
          <DmControlPanel
            gameId={gameId}
            initiative={initiative}
            onStartInitiative={props.onStartInitiative}
            onAdvanceTurn={props.onAdvanceTurn}
            onEndInitiative={props.onEndInitiative}
            monstersVisibleOnMap={monstersVisibleOnMap}
            onToggleMonstersVisibleOnMap={props.onToggleMonstersVisibleOnMap}
            sharedMonsterInitiative={props.sharedMonsterInitiative}
            onToggleSharedMonsterInitiative={props.onToggleSharedMonsterInitiative}
            hideMonsterAcInRollLog={hideMonsterAcInRollLog}
            onToggleHideMonsterAcInRollLog={props.onToggleHideMonsterAcInRollLog}
            busy={props.initiativeBusy || props.monsterBusy}
            monsters={monsters}
            characters={characters}
            monsterTargetById={props.monsterTargetById}
            sheetMonsterId={props.selectedMonsterId}
            onMonsterTargetChange={props.onMonsterTargetChange}
            onPatchMonsterHp={props.onPatchMonsterHp}
            onKillMonster={props.onKillMonster}
            onDeleteMonster={props.onDeleteMonster}
            onRollMonsterAttack={props.onRollMonsterAttack}
            onMonsterCombatRoll={props.onMonsterCombatRoll}
            onToggleMonsterInPlay={props.onToggleMonsterInPlay}
            rollingMonsterId={props.rollingMonsterId}
            rollingMonsterKind={props.rollingMonsterKind}
            onOpenMonsterSheet={props.onOpenMonsterSheet}
            lastAttackSummary={props.lastAttackSummary}
            handleMonsterUpdated={props.handleMonsterUpdated}
            applyGamePatch={props.applyGamePatch}
            onMonsterInitiativeChange={props.onMonsterInitiativeChange}
            onMonsterPanelError={props.onMonsterPanelError}
          />
        </Suspense>
      )}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Suspense fallback={<CircularProgress sx={{ m: 'auto' }} />}>
          <TacticalMap
            gameId={gameId}
            isDm={isDm}
            maps={maps}
            activeMap={activeMap}
            activeMapId={activeMapId}
            initiativeActive={initiativeActive}
            monstersVisibleOnMap={monstersVisibleOnMap}
            mapBusy={props.mapBusy}
            drawTool={props.drawTool}
            drawColor={props.drawColor}
            drawStrokeWidth={props.drawStrokeWidth}
            onDrawToolChange={props.onDrawToolChange}
            onDrawColorChange={props.onDrawColorChange}
            onDrawStrokeWidthChange={props.onDrawStrokeWidthChange}
            onImageScaleChange={props.onImageScaleChange}
            onSelectMap={props.onSelectMap}
            onPrevMap={props.onPrevMap}
            onNextMap={props.onNextMap}
            onAddMap={props.onAddMap}
            onDeleteMap={props.onDeleteMap}
            onToggleMapVisible={props.onToggleMapVisible}
            onGridPresetChange={props.onGridPresetChange}
            onUploadImage={props.onUploadImage}
            onRemoveImage={props.onRemoveImage}
            onRenameMap={props.onRenameMap}
            onResetPlayerTokens={props.onResetPlayerTokens}
            onResetMonsterTokens={props.onResetMonsterTokens}
            onClearDrawings={props.onClearDrawings}
            onDrawingsChange={props.onDrawingsChange}
            onTokenMove={props.onTokenMove}
            canDragToken={props.canDragToken}
            canLootToken={props.canLootToken}
            isTokenInitiativeActive={props.isTokenInitiativeActive}
            getTokenOverlay={props.getTokenOverlay}
            onTokenClick={props.onTokenClick}
            rollLog={rollLog}
            hideMonsterAcInRollLog={hideMonsterAcInRollLog}
            onClearRollLog={props.onClearRollLog}
            onApplyDamageFromRoll={props.onApplyDamageFromRoll}
          />
        </Suspense>
        <InitiativeOrderPanel
          initiative={initiative}
          characters={characters}
          monsters={monsters}
        />
      </Box>
    </Box>
  );
}
