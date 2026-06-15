import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Box } from '@mui/material';
import { Group, Layer, Stage } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  computeLayoutAnchorFromView,
  resolveMapGridPreset,
  type MapDrawing,
  type MapDrawTool,
  type MapLayoutAnchor,
  isMapTokenVisible,
  type MapTokenVisibilityContext,
} from '@dcc-web/shared';
import type { TokenMapOverlay } from '../../types/token-overlay';
import type { TacticalGameMap, TacticalMapToken } from '../../types/map';
import { MapViewportControls } from './MapViewportControls';
import { MapTokenChip } from './MapTokenChip';
import { TokenRangeOverlay } from './TokenRangeOverlay';
import { MapSceneLayer } from './MapSceneLayer';
import { useMapImage } from './useMapImage';
import { useTacticalMapViewport } from './useTacticalMapViewport';
import { useMapDrawingInteraction } from './useMapDrawingInteraction';

/** Keep chips clear of the zoom/fit controls in the canvas upper-right. */
const LAYOUT_INSET_RIGHT_PX = 130;
const LAYOUT_INSET_LEFT_PX = 12;
const LAYOUT_INSET_TOP_PX = 52;

export type TacticalMapCanvasHandle = {
  getLayoutAnchor: () => MapLayoutAnchor | undefined;
  getGridSize: () => { gridW: number; gridH: number };
};

interface TacticalMapCanvasProps {
  map: TacticalGameMap;
  isDm: boolean;
  tokenVisibility: MapTokenVisibilityContext;
  drawTool: MapDrawTool;
  drawColor: string;
  drawStrokeWidth: number;
  onDrawingsChange: (drawings: MapDrawing[]) => void;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  canDragToken?: (token: TacticalMapToken) => boolean;
  onTokenClick?: (token: TacticalMapToken) => void;
  canLootToken?: (token: TacticalMapToken) => boolean;
  isTokenInitiativeActive?: (token: TacticalMapToken) => boolean;
  getTokenOverlay?: (token: TacticalMapToken) => TokenMapOverlay | undefined;
}

export const TacticalMapCanvas = forwardRef<TacticalMapCanvasHandle, TacticalMapCanvasProps>(
  function TacticalMapCanvas(
    {
      map,
      isDm,
      tokenVisibility,
      drawTool,
      drawColor,
      drawStrokeWidth,
      onDrawingsChange,
      onTokenMove,
      canDragToken,
      onTokenClick,
      canLootToken,
      isTokenInitiativeActive,
      getTokenOverlay,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapGroupRef = useRef<Konva.Group>(null);
    const cell = map.gridCellPx || 50;
    const mapImage = useMapImage(map.imageUrl);
    const drawing = drawTool !== 'select' && isDm;
    const gridPreset = resolveMapGridPreset(map.gridPreset).id;

    const {
      viewport,
      scale,
      position,
      gridCols,
      gridRows,
      gridW,
      gridH,
      fitToView,
      trackPointer,
      handleWheel,
      zoomBy,
      handleMapPanStart,
      handleMapPanEnd,
      canZoomOut,
    } = useTacticalMapViewport({
      containerRef,
      mapGroupRef,
      mapId: map.id,
      gridPreset,
      cell,
      drawing,
    });

    const imageScale = map.imageScale ?? 1;
    const imageBaseW = map.widthPx > 0 ? map.widthPx : gridW;
    const imageBaseH = map.heightPx > 0 ? map.heightPx : gridH;
    const imageW = imageBaseW * imageScale;
    const imageH = imageBaseH * imageScale;
    const imageX = (gridW - imageW) / 2;
    const imageY = (gridH - imageH) / 2;

    useImperativeHandle(
      ref,
      () => ({
        getGridSize: () => ({ gridW, gridH }),
        getLayoutAnchor: () => {
          if (!viewport.width || !viewport.height) return undefined;
          const g = mapGroupRef.current;
          const posX = g?.x() ?? position.x;
          const posY = g?.y() ?? position.y;
          const sc = g?.scaleX() ?? scale;
          if (sc <= 0) return undefined;
          return computeLayoutAnchorFromView({
            viewportW: viewport.width,
            viewportH: viewport.height,
            positionX: posX,
            positionY: posY,
            scale: sc,
            cellPx: cell,
            insetRightPx: LAYOUT_INSET_RIGHT_PX,
            insetLeftPx: LAYOUT_INSET_LEFT_PX,
            insetTopPx: LAYOUT_INSET_TOP_PX,
          });
        },
      }),
      [viewport.width, viewport.height, position.x, position.y, scale, cell, gridW, gridH],
    );

    const screenToGrid = useCallback(
      (sx: number, sy: number) => ({
        x: (sx - position.x) / scale / cell,
        y: (sy - position.y) / scale / cell,
      }),
      [position.x, position.y, scale, cell],
    );

    const {
      draftPoints,
      previewShape,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    } = useMapDrawingInteraction({
      drawing,
      drawTool,
      drawColor,
      drawStrokeWidth,
      existingDrawings: map.dmDrawings,
      onDrawingsChange,
      screenToGrid,
      cell,
    });

    const visibleTokens = useMemo(() => {
      return map.tokens.filter((t) => {
        if (t.zone !== 'map') return false;
        return isMapTokenVisible(t, tokenVisibility);
      });
    }, [map.tokens, tokenVisibility]);

    return (
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          bgcolor: '#0d0b09',
          position: 'relative',
        }}
      >
        <Stage
          width={viewport.width}
          height={viewport.height}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            trackPointer(e);
            handlePointerDown(e);
          }}
          onMousemove={(e: KonvaEventObject<MouseEvent>) => {
            trackPointer(e);
            handlePointerMove(e);
          }}
          onMouseup={handlePointerUp}
          onTouchStart={(e) => {
            trackPointer(e);
            handlePointerDown(e);
          }}
          onTouchMove={(e) => {
            trackPointer(e);
            handlePointerMove(e);
          }}
          onTouchEnd={handlePointerUp}
          style={{ cursor: drawing ? (drawTool === 'erase' ? 'cell' : 'crosshair') : 'grab' }}
        >
          <Layer>
            <Group
              ref={mapGroupRef}
              draggable={!drawing}
              onDragStart={handleMapPanStart}
              onDragEnd={handleMapPanEnd}
            >
              <MapSceneLayer
                mapImage={mapImage}
                imageX={imageX}
                imageY={imageY}
                imageW={imageW}
                imageH={imageH}
                gridCols={gridCols}
                gridRows={gridRows}
                gridW={gridW}
                gridH={gridH}
                cell={cell}
                drawings={map.dmDrawings}
                drawTool={drawTool}
                drawColor={drawColor}
                drawStrokeWidth={drawStrokeWidth}
                draftPoints={draftPoints}
                previewShape={previewShape}
                drawing={drawing}
              />

              {visibleTokens.map((t) => {
                const overlay = getTokenOverlay?.(t);
                if (!overlay?.lightRadiusCells && !overlay?.movementRadiusCells) {
                  return null;
                }
                return (
                  <TokenRangeOverlay
                    key={`${t.id}-overlay`}
                    x={t.x * cell}
                    y={t.y * cell}
                    cell={cell}
                    lightRadiusCells={overlay.lightRadiusCells}
                    movementRadiusCells={overlay.movementRadiusCells}
                  />
                );
              })}

              {visibleTokens.map((t) => {
                const clickable = canLootToken?.(t) ?? false;
                const draggable =
                  (canDragToken ? canDragToken(t) : isDm) && (!t.isDead || isDm);
                return (
                  <MapTokenChip
                    key={t.id}
                    token={t}
                    cell={cell}
                    draggable={draggable}
                    clickable={clickable}
                    isActiveTurn={isTokenInitiativeActive?.(t) ?? false}
                    mapGroupRef={mapGroupRef}
                    allowMapPan={!drawing}
                    onMove={(x, y) => onTokenMove(t.id, x, y)}
                    onClick={clickable && onTokenClick ? () => onTokenClick(t) : undefined}
                  />
                );
              })}
            </Group>
          </Layer>
        </Stage>

        <MapViewportControls
          onZoomIn={() => zoomBy(1.2)}
          onZoomOut={() => canZoomOut && zoomBy(1 / 1.2)}
          onResetView={fitToView}
          canZoomOut={canZoomOut}
        />
      </Box>
    );
  },
);
