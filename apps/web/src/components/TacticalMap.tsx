import { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import type { MapDrawTool, MapGridPreset, MapLayoutAnchor, MapTokenVisibilityContext } from '@dcc-web/shared';
import { RollTrackerPanel } from './RollTrackerPanel';
import { MapToolbar } from './tactical-map/MapToolbar';
import {
  TacticalMapCanvas,
  type TacticalMapCanvasHandle,
} from './tactical-map/TacticalMapCanvas';
import type { DiceRollLogEntry } from '../types/dice-roll-log';
import type { TokenMapOverlay } from '../types/token-overlay';
import type { TacticalGameMap } from '../types/map';

interface TacticalMapProps {
  gameId?: string;
  isDm?: boolean;
  maps: TacticalGameMap[];
  activeMap: TacticalGameMap | null;
  activeMapId: string | null;
  initiativeActive?: boolean;
  monstersVisibleOnMap?: boolean;
  mapBusy?: boolean;
  drawTool: MapDrawTool;
  drawColor: string;
  drawStrokeWidth: number;
  onDrawToolChange: (tool: MapDrawTool) => void;
  onDrawColorChange: (color: string) => void;
  onDrawStrokeWidthChange: (width: number) => void;
  onImageScaleChange: (scale: number) => void;
  onSelectMap: (mapId: string) => void;
  onPrevMap: () => void;
  onNextMap: () => void;
  onAddMap: () => void;
  onDeleteMap: () => void;
  onToggleMapVisible: () => void;
  onGridPresetChange: (preset: MapGridPreset) => void;
  onUploadImage: (file: File, gridW?: number, gridH?: number) => void;
  onRemoveImage: () => void;
  onRenameMap: (name: string) => void;
  onResetPlayerTokens: (anchor?: MapLayoutAnchor) => void;
  onResetMonsterTokens: (anchor?: MapLayoutAnchor) => void;
  onClearDrawings: () => void;
  onDrawingsChange: (drawings: TacticalGameMap['dmDrawings']) => void;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  canDragToken?: (token: TacticalGameMap['tokens'][number]) => boolean;
  onTokenClick?: (token: TacticalGameMap['tokens'][number]) => void;
  canLootToken?: (token: TacticalGameMap['tokens'][number]) => boolean;
  isTokenInitiativeActive?: (token: TacticalGameMap['tokens'][number]) => boolean;
  getTokenOverlay?: (token: TacticalGameMap['tokens'][number]) => TokenMapOverlay | undefined;
  rollLog?: DiceRollLogEntry[];
  hideMonsterAcInRollLog?: boolean;
  onClearRollLog?: () => void;
  onApplyDamageFromRoll?: (roll: DiceRollLogEntry) => void;
}

export function TacticalMap({
  gameId,
  isDm,
  maps,
  activeMap,
  activeMapId,
  initiativeActive,
  monstersVisibleOnMap = false,
  mapBusy,
  drawTool,
  drawColor,
  drawStrokeWidth,
  onDrawToolChange,
  onDrawColorChange,
  onDrawStrokeWidthChange,
  onImageScaleChange,
  onSelectMap,
  onPrevMap,
  onNextMap,
  onAddMap,
  onDeleteMap,
  onToggleMapVisible,
  onGridPresetChange,
  onUploadImage,
  onRemoveImage,
  onRenameMap,
  onResetPlayerTokens,
  onResetMonsterTokens,
  onClearDrawings,
  onDrawingsChange,
  onTokenMove,
  canDragToken,
  onTokenClick,
  canLootToken,
  isTokenInitiativeActive,
  getTokenOverlay,
  rollLog = [],
  hideMonsterAcInRollLog = false,
  onClearRollLog,
  onApplyDamageFromRoll,
}: TacticalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<TacticalMapCanvasHandle>(null);
  const tokenVisibility: MapTokenVisibilityContext = {
    isDm: Boolean(isDm),
    initiativeActive: Boolean(initiativeActive),
    monstersVisibleOnMap,
  };
  const playerSeesLivingMonsters =
    Boolean(isDm) || Boolean(initiativeActive) || monstersVisibleOnMap;
  const playerHidden = !isDm && activeMap && !activeMap.visible;

  return (
    <Box
      ref={mapRef}
      sx={{
        flex: 1,
        minHeight: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0d0b09',
      }}
    >
      {isDm && (
        <MapToolbar
          maps={maps}
          activeMapId={activeMapId}
          drawTool={drawTool}
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          busy={mapBusy}
          onDrawToolChange={onDrawToolChange}
          onDrawColorChange={onDrawColorChange}
          onDrawStrokeWidthChange={onDrawStrokeWidthChange}
          onImageScaleChange={onImageScaleChange}
          onSelectMap={onSelectMap}
          onPrevMap={onPrevMap}
          onNextMap={onNextMap}
          onAddMap={onAddMap}
          onDeleteMap={onDeleteMap}
          onToggleVisible={onToggleMapVisible}
          onGridPresetChange={onGridPresetChange}
          onUploadImage={(file) => {
            const size = canvasRef.current?.getGridSize();
            onUploadImage(file, size?.gridW, size?.gridH);
          }}
          onRemoveImage={onRemoveImage}
          onRenameMap={onRenameMap}
          onResetPlayerTokens={() => {
            const anchor = canvasRef.current?.getLayoutAnchor();
            onResetPlayerTokens(anchor);
          }}
          onResetMonsterTokens={() => {
            const anchor = canvasRef.current?.getLayoutAnchor();
            onResetMonsterTokens(anchor);
          }}
          onClearDrawings={onClearDrawings}
        />
      )}

      {!isDm && activeMap && (
        <Box sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {activeMap.name} · {activeMap.gridFtPerCell}&apos; grid
            {!playerSeesLivingMonsters && ' · Living monster positions hidden until combat'}
          </Typography>
        </Box>
      )}

      {playerHidden ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary" textAlign="center">
            The DM has hidden this map.
          </Typography>
        </Box>
      ) : activeMap ? (
        <TacticalMapCanvas
          ref={canvasRef}
          map={activeMap}
          isDm={Boolean(isDm)}
          tokenVisibility={tokenVisibility}
          drawTool={drawTool}
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          onDrawingsChange={onDrawingsChange}
          onTokenMove={onTokenMove}
          canDragToken={canDragToken}
          onTokenClick={onTokenClick}
          canLootToken={canLootToken}
          isTokenInitiativeActive={isTokenInitiativeActive}
          getTokenOverlay={getTokenOverlay}
        />
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No map loaded.
          </Typography>
        </Box>
      )}

      <RollTrackerPanel
        gameId={gameId}
        containerRef={mapRef}
        rolls={rollLog}
        isDm={isDm}
        hideMonsterAcInRollLog={hideMonsterAcInRollLog}
        onClear={onClearRollLog}
        onApplyDamage={isDm ? onApplyDamageFromRoll : undefined}
      />
    </Box>
  );
}
