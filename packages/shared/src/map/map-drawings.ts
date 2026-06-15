export type MapDrawTool = 'select' | 'freehand' | 'circle' | 'rect' | 'erase';

export interface MapDrawingBase {
  id: string;
  color: string;
  strokeWidth: number;
}

export interface MapDrawingStroke extends MapDrawingBase {
  tool: 'freehand';
  /** Grid-cell coordinates [x, y, x, y, ...] */
  points: number[];
}

export interface MapDrawingShape extends MapDrawingBase {
  tool: 'circle' | 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MapDrawing = MapDrawingStroke | MapDrawingShape;

export function parseMapDrawings(raw: unknown): MapDrawing[] {
  if (!Array.isArray(raw)) return [];
  const out: MapDrawing[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'string') continue;
    const color = typeof o.color === 'string' ? o.color : '#c9a227';
    const strokeWidth = typeof o.strokeWidth === 'number' ? o.strokeWidth : 2;
    if (o.tool === 'freehand' && Array.isArray(o.points)) {
      out.push({
        id: o.id,
        tool: 'freehand',
        color,
        strokeWidth,
        points: o.points.map(Number).filter((n) => Number.isFinite(n)),
      });
    } else if (
      (o.tool === 'circle' || o.tool === 'rect') &&
      typeof o.x === 'number' &&
      typeof o.y === 'number' &&
      typeof o.width === 'number' &&
      typeof o.height === 'number'
    ) {
      out.push({
        id: o.id,
        tool: o.tool,
        color,
        strokeWidth,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
      });
    }
  }
  return out;
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function pointNearPath(px: number, py: number, path: number[], radius: number): boolean {
  const r2 = radius * radius;
  for (let i = 0; i < path.length - 2; i += 2) {
    const x1 = path[i]!;
    const y1 = path[i + 1]!;
    const x2 = path[i + 2]!;
    const y2 = path[i + 3]!;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-8) {
      if (distSq(px, py, x1, y1) <= r2) return true;
      continue;
    }
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    if (distSq(px, py, cx, cy) <= r2) return true;
  }
  return false;
}

function drawingHitByErasePath(drawing: MapDrawing, erasePath: number[], radius: number): boolean {
  if (erasePath.length < 2) return false;
  if (drawing.tool === 'freehand') {
    for (let i = 0; i < drawing.points.length; i += 2) {
      const x = drawing.points[i]!;
      const y = drawing.points[i + 1]!;
      if (pointNearPath(x, y, erasePath, radius)) return true;
    }
    return false;
  }
  const samples = [
    [drawing.x, drawing.y],
    [drawing.x + drawing.width, drawing.y],
    [drawing.x, drawing.y + drawing.height],
    [drawing.x + drawing.width, drawing.y + drawing.height],
    [drawing.x + drawing.width / 2, drawing.y + drawing.height / 2],
  ];
  return samples.some(([x, y]) => pointNearPath(x, y, erasePath, radius));
}

/** Remove drawings touched by an erase stroke (grid-cell coordinates). */
export function eraseDrawingsAtPath(
  drawings: MapDrawing[],
  erasePath: number[],
  radius: number,
): MapDrawing[] {
  if (erasePath.length < 4) return drawings;
  return drawings.filter((d) => !drawingHitByErasePath(d, erasePath, radius));
}

/** Fit image pixel dimensions into a grid footprint while preserving aspect ratio. */
export function fitImageToGrid(
  naturalW: number,
  naturalH: number,
  gridW: number,
  gridH: number,
): { widthPx: number; heightPx: number } {
  if (naturalW <= 0 || naturalH <= 0) return { widthPx: gridW, heightPx: gridH };
  const scale = Math.min(gridW / naturalW, gridH / naturalH);
  return {
    widthPx: Math.round(naturalW * scale),
    heightPx: Math.round(naturalH * scale),
  };
}
