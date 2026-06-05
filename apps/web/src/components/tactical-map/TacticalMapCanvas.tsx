import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box } from '@mui/material';
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  MAP_MAX_ZOOM,
  computeLayoutAnchorFromView,
  computeMapGridDimensions,
  resolveMapGridPreset,
  type MapDrawing,
  type MapDrawTool,
  type MapLayoutAnchor,
} from '@dcc-web/shared';
import type { TacticalGameMap, TacticalMapToken } from '../../types/map';
import { MapViewportControls } from './MapViewportControls';

const TOKEN_RADIUS_FACTOR = 0.285;
/** Keep chips clear of the zoom/fit controls in the canvas upper-right. */
const LAYOUT_INSET_RIGHT_PX = 130;
const LAYOUT_INSET_TOP_PX = 52;

export type TacticalMapCanvasHandle = {
  getLayoutAnchor: () => MapLayoutAnchor | undefined;
};

interface TacticalMapCanvasProps {
  map: TacticalGameMap;
  isDm: boolean;
  showMonsterTokens: boolean;
  drawTool: MapDrawTool;
  drawColor: string;
  onDrawingsChange: (drawings: MapDrawing[]) => void;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  canDragToken?: (token: TacticalMapToken) => boolean;
}

function useMapImage(url: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const src = url.startsWith('/uploads/') ? `/api${url}` : url;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [url]);
  return image;
}

function getMinScale(viewportW: number, viewportH: number, gridW: number, gridH: number): number {
  return Math.min(viewportW / gridW, viewportH / gridH);
}

/** Clamp zoom only — pan position is never forced to grid edges or center. */
function clampViewport(
  scale: number,
  pos: { x: number; y: number },
  viewportW: number,
  viewportH: number,
  gridW: number,
  gridH: number,
): { scale: number; pos: { x: number; y: number } } {
  const minScale = getMinScale(viewportW, viewportH, gridW, gridH);
  const clampedScale = Math.min(MAP_MAX_ZOOM, Math.max(minScale, scale));
  return { scale: clampedScale, pos };
}

function computeFitView(
  viewportW: number,
  viewportH: number,
  gridW: number,
  gridH: number,
): { scale: number; pos: { x: number; y: number } } {
  const scale = getMinScale(viewportW, viewportH, gridW, gridH);
  const scaledW = gridW * scale;
  const scaledH = gridH * scale;
  return {
    scale,
    pos: {
      x: (viewportW - scaledW) / 2,
      y: (viewportH - scaledH) / 2,
    },
  };
}

/** Zoom toward a screen anchor, keeping the world point under the cursor fixed. */
function zoomViewAtPoint(
  anchor: { x: number; y: number },
  factor: number,
  currentScale: number,
  currentPos: { x: number; y: number },
  viewportW: number,
  viewportH: number,
  gridW: number,
  gridH: number,
): { scale: number; pos: { x: number; y: number } } {
  const minScale = getMinScale(viewportW, viewportH, gridW, gridH);
  const nextScale = Math.min(MAP_MAX_ZOOM, Math.max(minScale, currentScale * factor));
  const worldX = (anchor.x - currentPos.x) / currentScale;
  const worldY = (anchor.y - currentPos.y) / currentScale;
  return {
    scale: nextScale,
    pos: {
      x: anchor.x - worldX * nextScale,
      y: anchor.y - worldY * nextScale,
    },
  };
}

export const TacticalMapCanvas = forwardRef<TacticalMapCanvasHandle, TacticalMapCanvasProps>(
  function TacticalMapCanvas(
    {
      map,
      isDm,
      showMonsterTokens,
      drawTool,
      drawColor,
      onDrawingsChange,
      onTokenMove,
      canDragToken,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapGroupRef = useRef<Konva.Group>(null);
    const panningRef = useRef(false);
    const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
    const cell = map.gridCellPx || 50;
    const mapImage = useMapImage(map.imageUrl);

    const [viewport, setViewport] = useState({ width: 800, height: 600 });
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const lastViewKeyRef = useRef(`${map.id}:${map.gridPreset}`);
    const viewRef = useRef({ scale: 1, position: { x: 0, y: 0 } });
    viewRef.current = { scale, position };

    const [draftPoints, setDraftPoints] = useState<number[]>([]);
    const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
    const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);
    const drawing = drawTool !== 'select' && isDm;

    const gridPreset = resolveMapGridPreset(map.gridPreset).id;
    const { cols: gridCols, rows: gridRows, gridW, gridH } = useMemo(
      () =>
        computeMapGridDimensions(
          gridPreset,
          cell,
          Math.max(viewport.width, 1),
          Math.max(viewport.height, 1),
        ),
      [gridPreset, cell, viewport.width, viewport.height],
    );

    const applyView = useCallback(
      (nextScale: number, nextPos: { x: number; y: number }) => {
        const clamped = clampViewport(
          nextScale,
          nextPos,
          viewport.width,
          viewport.height,
          gridW,
          gridH,
        );
        viewRef.current = { scale: clamped.scale, position: clamped.pos };
        setScale(clamped.scale);
        setPosition(clamped.pos);
      },
      [viewport.width, viewport.height, gridW, gridH],
    );

    const zoomAtPoint = useCallback(
      (anchor: { x: number; y: number }, factor: number) => {
        const { scale: s, position: p } = viewRef.current;
        const next = zoomViewAtPoint(
          anchor,
          factor,
          s,
          p,
          viewport.width,
          viewport.height,
          gridW,
          gridH,
        );
        viewRef.current = { scale: next.scale, position: next.pos };
        setScale(next.scale);
        setPosition(next.pos);
      },
      [viewport.width, viewport.height, gridW, gridH],
    );

    const fitToView = useCallback(() => {
      const fit = computeFitView(viewport.width, viewport.height, gridW, gridH);
      setScale(fit.scale);
      setPosition(fit.pos);
    }, [viewport.width, viewport.height, gridW, gridH]);

    useEffect(() => {
      if (panningRef.current) return;
      const g = mapGroupRef.current;
      if (!g) return;
      g.position({ x: position.x, y: position.y });
      g.scale({ x: scale, y: scale });
    }, [position.x, position.y, scale]);

    useEffect(() => {
      mapGroupRef.current?.draggable(!drawing);
    }, [drawing]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => {
        setViewport({ width: el.clientWidth, height: el.clientHeight });
      });
      ro.observe(el);
      setViewport({ width: el.clientWidth, height: el.clientHeight });
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const viewKey = `${map.id}:${map.gridPreset}`;
      if (lastViewKeyRef.current !== viewKey) {
        lastViewKeyRef.current = viewKey;
        fitToView();
      }
    }, [map.id, map.gridPreset, fitToView]);

    useEffect(() => {
      fitToView();
    }, [gridW, gridH, fitToView]);

    useEffect(() => {
      const { scale: s, position: p } = viewRef.current;
      const clamped = clampViewport(s, p, viewport.width, viewport.height, gridW, gridH);
      if (clamped.scale !== s || clamped.pos.x !== p.x || clamped.pos.y !== p.y) {
        setScale(clamped.scale);
        setPosition(clamped.pos);
      }
    }, [viewport.width, viewport.height, gridW, gridH]);

    useImperativeHandle(
      ref,
      () => ({
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
            insetTopPx: LAYOUT_INSET_TOP_PX,
          });
        },
      }),
      [viewport.width, viewport.height, position.x, position.y, scale, cell],
    );

    const screenToGrid = useCallback(
      (sx: number, sy: number) => ({
        x: (sx - position.x) / scale / cell,
        y: (sy - position.y) / scale / cell,
      }),
      [position.x, position.y, scale, cell],
    );

    const visibleTokens = useMemo(() => {
      return map.tokens.filter((t) => {
        if (t.zone !== 'map') return false;
        if (t.kind === 'monster' && !showMonsterTokens) return false;
        return true;
      });
    }, [map.tokens, showMonsterTokens]);

    const finishStroke = (points: number[]) => {
      if (points.length < 4) return;
      const id = `draw-${Date.now()}`;
      onDrawingsChange([
        ...map.dmDrawings,
        { id, tool: 'freehand', points, color: drawColor, strokeWidth: 2 },
      ]);
    };

    const finishShape = (
      tool: 'circle' | 'rect',
      a: { x: number; y: number },
      b: { x: number; y: number },
    ) => {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const width = Math.abs(b.x - a.x);
      const height = Math.abs(b.y - a.y);
      if (width < 0.15 && height < 0.15) return;
      const id = `draw-${Date.now()}`;
      onDrawingsChange([
        ...map.dmDrawings,
        { id, tool, x, y, width, height, color: drawColor, strokeWidth: 2 },
      ]);
    };

    const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawing) return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const g = screenToGrid(pos.x, pos.y);
      if (drawTool === 'freehand') {
        setDraftPoints([g.x, g.y]);
      } else if (drawTool === 'circle' || drawTool === 'rect') {
        setShapeStart(g);
        setShapeEnd(g);
      }
    };

    const handlePointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawing) return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const g = screenToGrid(pos.x, pos.y);
      if (drawTool === 'freehand' && draftPoints.length > 0) {
        setDraftPoints((prev) => [...prev, g.x, g.y]);
      } else if ((drawTool === 'circle' || drawTool === 'rect') && shapeStart) {
        setShapeEnd(g);
      }
    };

    const handlePointerUp = () => {
      if (!drawing) return;
      if (drawTool === 'freehand' && draftPoints.length > 0) {
        finishStroke(draftPoints);
        setDraftPoints([]);
      } else if ((drawTool === 'circle' || drawTool === 'rect') && shapeStart && shapeEnd) {
        finishShape(drawTool, shapeStart, shapeEnd);
        setShapeStart(null);
        setShapeEnd(null);
      }
    };

    const trackPointer = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) lastPointerRef.current = pos;
    };

    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      lastPointerRef.current = pointer;
      const delta = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
      zoomAtPoint(pointer, delta);
    };

    const zoomBy = (factor: number) => {
      const anchor = lastPointerRef.current ?? {
        x: viewport.width / 2,
        y: viewport.height / 2,
      };
      zoomAtPoint(anchor, factor);
    };

    const handleMapPanEnd = (e: KonvaEventObject<DragEvent>) => {
      panningRef.current = false;
      applyView(scale, { x: e.target.x(), y: e.target.y() });
    };

    const minScale = getMinScale(viewport.width, viewport.height, gridW, gridH);
    const canZoomOut = scale > minScale + 0.001;

    const previewShape =
      shapeStart && shapeEnd
        ? {
            x: Math.min(shapeStart.x, shapeEnd.x) * cell,
            y: Math.min(shapeStart.y, shapeEnd.y) * cell,
            width: Math.abs(shapeEnd.x - shapeStart.x) * cell,
            height: Math.abs(shapeEnd.y - shapeStart.y) * cell,
          }
        : null;

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
          onMousemove={(e) => {
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
          style={{ cursor: drawing ? 'crosshair' : 'grab' }}
        >
          <Layer>
            <Group
              ref={mapGroupRef}
              draggable={!drawing}
              onDragStart={() => {
                panningRef.current = true;
              }}
              onDragEnd={handleMapPanEnd}
            >
              {mapImage && (
                <KonvaImage
                  image={mapImage}
                  x={0}
                  y={0}
                  width={gridW}
                  height={gridH}
                  listening={false}
                />
              )}
              {Array.from({ length: gridCols + 1 }, (_, i) => (
                <Line
                  key={`v${i}`}
                  points={[i * cell, 0, i * cell, gridH]}
                  stroke="rgba(201, 162, 39, 0.12)"
                  strokeWidth={1}
                  listening={false}
                />
              ))}
              {Array.from({ length: gridRows + 1 }, (_, i) => (
                <Line
                  key={`h${i}`}
                  points={[0, i * cell, gridW, i * cell]}
                  stroke="rgba(201, 162, 39, 0.12)"
                  strokeWidth={1}
                  listening={false}
                />
              ))}

              {map.dmDrawings.map((d) => {
                if (d.tool === 'freehand') {
                  return (
                    <Line
                      key={d.id}
                      points={d.points.map((v, i) => (i % 2 === 0 ? v * cell : v * cell))}
                      stroke={d.color}
                      strokeWidth={d.strokeWidth}
                      lineCap="round"
                      lineJoin="round"
                      listening={false}
                    />
                  );
                }
                if (d.tool === 'rect') {
                  return (
                    <Rect
                      key={d.id}
                      x={d.x * cell}
                      y={d.y * cell}
                      width={d.width * cell}
                      height={d.height * cell}
                      stroke={d.color}
                      strokeWidth={d.strokeWidth}
                      listening={false}
                    />
                  );
                }
                return (
                  <Circle
                    key={d.id}
                    x={(d.x + d.width / 2) * cell}
                    y={(d.y + d.height / 2) * cell}
                    radius={(Math.max(d.width, d.height) / 2) * cell}
                    stroke={d.color}
                    strokeWidth={d.strokeWidth}
                    listening={false}
                  />
                );
              })}
              {draftPoints.length > 0 && (
                <Line
                  points={draftPoints.map((v, i) => (i % 2 === 0 ? v * cell : v * cell))}
                  stroke={drawColor}
                  strokeWidth={2}
                  lineCap="round"
                  lineJoin="round"
                  listening={false}
                />
              )}
              {previewShape && drawTool === 'rect' && (
                <Rect
                  {...previewShape}
                  stroke={drawColor}
                  strokeWidth={2}
                  dash={[6, 4]}
                  listening={false}
                />
              )}
              {previewShape && drawTool === 'circle' && (
                <Circle
                  x={previewShape.x + previewShape.width / 2}
                  y={previewShape.y + previewShape.height / 2}
                  radius={Math.max(previewShape.width, previewShape.height) / 2}
                  stroke={drawColor}
                  strokeWidth={2}
                  dash={[6, 4]}
                  listening={false}
                />
              )}

              <Rect
                x={0}
                y={0}
                width={gridW}
                height={gridH}
                fill="rgba(0,0,0,0.002)"
                listening={!drawing}
              />

              {visibleTokens.map((t) => (
                <MapTokenChip
                  key={t.id}
                  token={t}
                  cell={cell}
                  draggable={!t.isDead && (canDragToken ? canDragToken(t) : isDm)}
                  mapGroupRef={mapGroupRef}
                  allowMapPan={!drawing}
                  onMove={(x, y) => onTokenMove(t.id, x, y)}
                />
              ))}
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

function MapTokenChip({
  token,
  cell,
  draggable,
  mapGroupRef,
  allowMapPan,
  onMove,
}: {
  token: TacticalMapToken;
  cell: number;
  draggable: boolean;
  mapGroupRef: React.RefObject<Konva.Group | null>;
  allowMapPan: boolean;
  onMove: (x: number, y: number) => void;
}) {
  const r = cell * TOKEN_RADIUS_FACTOR;
  const groupRef = useRef<Konva.Group>(null);
  const draggingRef = useRef(false);
  const isDead = Boolean(token.isDead);
  const displayLabel = isDead ? `${token.label} (dead)` : token.label;

  useEffect(() => {
    if (draggingRef.current) return;
    groupRef.current?.position({ x: token.x * cell, y: token.y * cell });
  }, [token.x, token.y, cell]);

  return (
    <Group
      ref={groupRef}
      draggable={draggable}
      onDragStart={(e) => {
        draggingRef.current = true;
        mapGroupRef.current?.draggable(false);
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        draggingRef.current = false;
        if (allowMapPan) mapGroupRef.current?.draggable(true);
        const nx = e.target.x() / cell;
        const ny = e.target.y() / cell;
        onMove(nx, ny);
      }}
    >
      <Circle
        x={0}
        y={0}
        radius={r}
        fill={isDead ? '#4a4a4a' : token.color}
        opacity={isDead ? 0.65 : 1}
        stroke={isDead ? '#888' : token.kind === 'monster' ? '#3a1010' : '#1a1510'}
        strokeWidth={2}
        dash={isDead ? [4, 3] : undefined}
      />
      {isDead && (
        <>
          <Line
            points={[-r * 0.55, -r * 0.55, r * 0.55, r * 0.55]}
            stroke="#e8e0d0"
            strokeWidth={2}
            listening={false}
          />
          <Line
            points={[-r * 0.55, r * 0.55, r * 0.55, -r * 0.55]}
            stroke="#e8e0d0"
            strokeWidth={2}
            listening={false}
          />
        </>
      )}
      <Text
        x={-r}
        y={-r - 10}
        width={r * 2}
        text={displayLabel}
        fontSize={8}
        fill={isDead ? '#b0a898' : '#f8f4ea'}
        align="center"
        listening={false}
      />
    </Group>
  );
}
