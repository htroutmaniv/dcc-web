import { useCallback, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { eraseDrawingsAtPath, type MapDrawing, type MapDrawTool } from '@dcc-web/shared';

export function useMapDrawingInteraction({
  drawing,
  drawTool,
  drawColor,
  drawStrokeWidth,
  existingDrawings,
  onDrawingsChange,
  screenToGrid,
  cell,
}: {
  drawing: boolean;
  drawTool: MapDrawTool;
  drawColor: string;
  drawStrokeWidth: number;
  existingDrawings: MapDrawing[];
  onDrawingsChange: (drawings: MapDrawing[]) => void;
  screenToGrid: (sx: number, sy: number) => { x: number; y: number };
  cell: number;
}) {
  const [draftPoints, setDraftPoints] = useState<number[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);

  const finishStroke = useCallback(
    (points: number[]) => {
      if (points.length < 4) return;
      const id = `draw-${Date.now()}`;
      onDrawingsChange([
        ...existingDrawings,
        { id, tool: 'freehand', points, color: drawColor, strokeWidth: drawStrokeWidth },
      ]);
    },
    [existingDrawings, drawColor, drawStrokeWidth, onDrawingsChange],
  );

  const finishShape = useCallback(
    (tool: 'circle' | 'rect', a: { x: number; y: number }, b: { x: number; y: number }) => {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const width = Math.abs(b.x - a.x);
      const height = Math.abs(b.y - a.y);
      if (width < 0.15 && height < 0.15) return;
      const id = `draw-${Date.now()}`;
      onDrawingsChange([
        ...existingDrawings,
        { id, tool, x, y, width, height, color: drawColor, strokeWidth: drawStrokeWidth },
      ]);
    },
    [existingDrawings, drawColor, drawStrokeWidth, onDrawingsChange],
  );

  const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!drawing) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const g = screenToGrid(pos.x, pos.y);
    if (drawTool === 'freehand' || drawTool === 'erase') {
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
    if ((drawTool === 'freehand' || drawTool === 'erase') && draftPoints.length > 0) {
      setDraftPoints((prev) => [...prev, g.x, g.y]);
    } else if ((drawTool === 'circle' || drawTool === 'rect') && shapeStart) {
      setShapeEnd(g);
    }
  };

  const handlePointerUp = () => {
    if (!drawing) return;
    if (drawTool === 'erase' && draftPoints.length > 0) {
      const radius = Math.max(0.5, drawStrokeWidth * 0.75);
      onDrawingsChange(eraseDrawingsAtPath(existingDrawings, draftPoints, radius));
      setDraftPoints([]);
    } else if (drawTool === 'freehand' && draftPoints.length > 0) {
      finishStroke(draftPoints);
      setDraftPoints([]);
    } else if ((drawTool === 'circle' || drawTool === 'rect') && shapeStart && shapeEnd) {
      finishShape(drawTool, shapeStart, shapeEnd);
      setShapeStart(null);
      setShapeEnd(null);
    }
  };

  const previewShape =
    shapeStart && shapeEnd
      ? {
          x: Math.min(shapeStart.x, shapeEnd.x) * cell,
          y: Math.min(shapeStart.y, shapeEnd.y) * cell,
          width: Math.abs(shapeEnd.x - shapeStart.x) * cell,
          height: Math.abs(shapeEnd.y - shapeStart.y) * cell,
        }
      : null;

  return {
    draftPoints,
    previewShape,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
