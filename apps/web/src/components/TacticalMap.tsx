import { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import type { MapDrawTool, MapGridPreset, MapLayoutAnchor } from '@dcc-web/shared';
import { RollTrackerPanel } from './RollTrackerPanel';
import { MapToolbar } from './tactical-map/MapToolbar';
import {
  TacticalMapCanvas,
  type TacticalMapCanvasHandle,
} from './tactical-map/TacticalMapCanvas';
import type { DiceRollLogEntry } from '../types/dice-roll-log';
import type { TacticalGameMap } from '../types/map';

interface TacticalMapProps {
  gameId?: string;
  isDm?: boolean;
  maps: TacticalGameMap[];
  activeMap: TacticalGameMap | null;
  activeMapId: string | null;
  initiativeActive?: boolean;
  mapBusy?: boolean;
  drawTool: MapDrawTool;
  drawColor: string;
  onDrawToolChange: (tool: MapDrawTool) => void;
  onDrawColorChange: (color: string) => void;
  onSelectMap: (mapId: string) => void;
  onPrevMap: () => void;
  onNextMap: () => void;
  onAddMap: () => void;
  onDeleteMap: () => void;
  onToggleMapVisible: () => void;
  onGridPresetChange: (preset: MapGridPreset) => void;
  onUploadImage: (file: File) => void;
  onRemoveImage: () => void;
  onSyncTokens: () => void;
  onLayoutTokens: (anchor?: MapLayoutAnchor) => void;
  onClearDrawings: () => void;
  onDrawingsChange: (drawings: TacticalGameMap['dmDrawings']) => void;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  canDragToken?: (token: TacticalGameMap['tokens'][number]) => boolean;
  rollLog?: DiceRollLogEntry[];
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
  mapBusy,
  drawTool,
  drawColor,
  onDrawToolChange,
  onDrawColorChange,
  onSelectMap,
  onPrevMap,
  onNextMap,
  onAddMap,
  onDeleteMap,
  onToggleMapVisible,
  onGridPresetChange,
  onUploadImage,
  onRemoveImage,
  onSyncTokens,
  onLayoutTokens,
  onClearDrawings,
  onDrawingsChange,
  onTokenMove,
  canDragToken,
  rollLog = [],
  onClearRollLog,
  onApplyDamageFromRoll,
}: TacticalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<TacticalMapCanvasHandle>(null);
  const showMonsterTokens = Boolean(isDm || initiativeActive);
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
          busy={mapBusy}
          onDrawToolChange={onDrawToolChange}
          onDrawColorChange={onDrawColorChange}
          onSelectMap={onSelectMap}
          onPrevMap={onPrevMap}
          onNextMap={onNextMap}
          onAddMap={onAddMap}
          onDeleteMap={onDeleteMap}
          onToggleVisible={onToggleMapVisible}
          onGridPresetChange={onGridPresetChange}
          onUploadImage={onUploadImage}
          onRemoveImage={onRemoveImage}
          onSyncTokens={onSyncTokens}
          onLayoutTokens={() => {
            const anchor = canvasRef.current?.getLayoutAnchor();
            if (anchor) onLayoutTokens(anchor);
          }}
          onClearDrawings={onClearDrawings}
        />
      )}

      {!isDm && activeMap && (
        <Box sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {activeMap.name} · {activeMap.gridFtPerCell}&apos; grid
            {!showMonsterTokens && ' · Monster positions hidden until combat'}
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
          showMonsterTokens={showMonsterTokens}
          drawTool={drawTool}
          drawColor={drawColor}
          onDrawingsChange={onDrawingsChange}
          onTokenMove={onTokenMove}
          canDragToken={canDragToken}
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
        onClear={onClearRollLog}
        onApplyDamage={isDm ? onApplyDamageFromRoll : undefined}
      />
    </Box>
  );
}
