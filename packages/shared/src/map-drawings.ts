export type MapDrawTool = 'select' | 'freehand' | 'circle' | 'rect';

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
