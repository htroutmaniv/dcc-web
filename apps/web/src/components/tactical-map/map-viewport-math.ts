import { MAP_MAX_ZOOM } from '@dcc-web/shared';

export function getMinScale(
  viewportW: number,
  viewportH: number,
  gridW: number,
  gridH: number,
): number {
  return Math.min(viewportW / gridW, viewportH / gridH);
}

/** Clamp zoom only — pan position is never forced to grid edges or center. */
export function clampViewport(
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

export function computeFitView(
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
export function zoomViewAtPoint(
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
