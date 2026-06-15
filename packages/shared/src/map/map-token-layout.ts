import {
  MAP_GRID_MIN_COLS,
  MAP_GRID_MIN_ROWS,
  type MapGridPreset,
  resolveMapGridPreset,
} from './map-grid.js';

export const MAP_MAX_ZOOM = 3;

/** @deprecated Use computeMapGridDimensions */
export const TACTICAL_MAP_COLS = MAP_GRID_MIN_COLS;

/** @deprecated Use computeMapGridDimensions */
export const TACTICAL_MAP_ROWS = MAP_GRID_MIN_ROWS;

/**
 * Grid cells sized to match the canvas aspect ratio (no empty margins at fit zoom),
 * with at least town-scale footprint, scaled up per preset.
 */
export function computeMapGridDimensions(
  preset: MapGridPreset | string | null | undefined,
  cellPx: number,
  viewportW: number,
  viewportH: number,
): { cols: number; rows: number; gridW: number; gridH: number } {
  const config = resolveMapGridPreset(preset);
  const aspect = viewportW / Math.max(viewportH, 1);
  const baseAspect = MAP_GRID_MIN_COLS / MAP_GRID_MIN_ROWS;

  let cols = MAP_GRID_MIN_COLS;
  let rows = MAP_GRID_MIN_ROWS;
  if (aspect > baseAspect) {
    cols = Math.max(MAP_GRID_MIN_COLS, Math.ceil(rows * aspect));
  } else {
    rows = Math.max(MAP_GRID_MIN_ROWS, Math.ceil(cols / aspect));
  }

  const mult = config.sizeMultiplier;
  cols = Math.ceil(cols * mult);
  rows = Math.ceil(rows * mult);

  return { cols, rows, gridW: cols * cellPx, gridH: rows * cellPx };
}

const LAYOUT_MARGIN_CELLS = 1.5;
const LAYOUT_COLS_PER_ROW = 4;
const LAYOUT_CELL_SPACING = 1.25;

export interface VisibleGridRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MapViewLayoutInput {
  viewportW: number;
  viewportH: number;
  positionX: number;
  positionY: number;
  scale: number;
  cellPx: number;
  /** Screen pixels to keep clear at the top-right (e.g. zoom controls). */
  insetRightPx?: number;
  /** Screen pixels to keep clear at the top-left. */
  insetLeftPx?: number;
  insetTopPx?: number;
}

export interface MapLayoutAnchor {
  anchorRightCol: number;
  anchorLeftCol: number;
  anchorTopRow: number;
  visibleLeft: number;
  visibleTop: number;
  visibleRight: number;
  visibleBottom: number;
}

/** Grid coordinates of the rectangle currently visible in the map canvas. */
export function computeVisibleGridRect(view: MapViewLayoutInput): VisibleGridRect {
  const { viewportW, viewportH, positionX, positionY, scale, cellPx } = view;
  const cell = cellPx;
  return {
    left: -positionX / scale / cell,
    top: -positionY / scale / cell,
    right: (viewportW - positionX) / scale / cell,
    bottom: (viewportH - positionY) / scale / cell,
  };
}

/** Anchor for reset-layout: upper-right of the visible canvas, inset from UI chrome. */
export function computeLayoutAnchorFromView(view: MapViewLayoutInput): MapLayoutAnchor {
  const rect = computeVisibleGridRect(view);
  const insetRight =
    (view.insetRightPx ?? 0) / Math.max(view.scale, Number.EPSILON) / view.cellPx;
  const insetLeft =
    (view.insetLeftPx ?? 0) / Math.max(view.scale, Number.EPSILON) / view.cellPx;
  const insetTop =
    (view.insetTopPx ?? 0) / Math.max(view.scale, Number.EPSILON) / view.cellPx;

  return {
    visibleLeft: rect.left,
    visibleTop: rect.top,
    visibleRight: rect.right,
    visibleBottom: rect.bottom,
    anchorRightCol: rect.right - insetRight - LAYOUT_MARGIN_CELLS,
    anchorLeftCol: rect.left + insetLeft + LAYOUT_MARGIN_CELLS,
    anchorTopRow: rect.top + insetTop + LAYOUT_MARGIN_CELLS,
  };
}

export interface TokenGridLayoutOptions {
  anchorRightCol?: number;
  anchorLeftCol?: number;
  anchorTopRow?: number;
  visibleLeft?: number;
  visibleTop?: number;
  visibleRight?: number;
  visibleBottom?: number;
}

function fitClusterToVisibleBounds(
  count: number,
  anchorRightCol: number,
  anchorTopRow: number,
  bounds: VisibleGridRect,
): { rightCol: number; topRow: number } {
  const margin = LAYOUT_MARGIN_CELLS;
  const colsInFirstRow = Math.min(count, LAYOUT_COLS_PER_ROW);
  const rows = Math.ceil(count / LAYOUT_COLS_PER_ROW);
  const clusterWidth =
    colsInFirstRow > 1 ? (colsInFirstRow - 1) * LAYOUT_CELL_SPACING : 0;
  const clusterHeight = rows > 1 ? (rows - 1) * LAYOUT_CELL_SPACING : 0;

  let rightCol = Math.min(anchorRightCol, bounds.right - margin);
  let topRow = Math.max(anchorTopRow, bounds.top + margin);

  const minRightCol = bounds.left + clusterWidth + margin;
  if (rightCol < minRightCol) {
    rightCol = Math.min(bounds.right - margin, minRightCol);
  }

  const maxTopRow = bounds.bottom - clusterHeight - margin;
  if (topRow > maxTopRow) {
    topRow = Math.max(bounds.top + margin, maxTopRow);
  }

  return { rightCol, topRow };
}

function fitClusterToVisibleBoundsLeft(
  count: number,
  anchorLeftCol: number,
  anchorTopRow: number,
  bounds: VisibleGridRect,
): { leftCol: number; topRow: number } {
  const margin = LAYOUT_MARGIN_CELLS;
  const colsInFirstRow = Math.min(count, LAYOUT_COLS_PER_ROW);
  const rows = Math.ceil(count / LAYOUT_COLS_PER_ROW);
  const clusterWidth =
    colsInFirstRow > 1 ? (colsInFirstRow - 1) * LAYOUT_CELL_SPACING : 0;
  const clusterHeight = rows > 1 ? (rows - 1) * LAYOUT_CELL_SPACING : 0;

  let leftCol = Math.max(anchorLeftCol, bounds.left + margin);
  let topRow = Math.max(anchorTopRow, bounds.top + margin);

  const maxLeftCol = bounds.right - clusterWidth - margin;
  if (leftCol > maxLeftCol) {
    leftCol = Math.max(bounds.left + margin, maxLeftCol);
  }

  const maxTopRow = bounds.bottom - clusterHeight - margin;
  if (topRow > maxTopRow) {
    topRow = Math.max(bounds.top + margin, maxTopRow);
  }

  return { leftCol, topRow };
}

/** Place token centers in a grid anchored to the upper-right of the visible canvas. */
export function computeUpperRightTokenGrid(
  count: number,
  options?: TokenGridLayoutOptions,
): { x: number; y: number }[] {
  const fallbackRightCol = MAP_GRID_MIN_COLS - LAYOUT_MARGIN_CELLS - 1;
  const fallbackTopRow = LAYOUT_MARGIN_CELLS + 1;

  let rightCol =
    options?.anchorRightCol != null ? options.anchorRightCol : fallbackRightCol;
  let topRow = options?.anchorTopRow != null ? options.anchorTopRow : fallbackTopRow;

  const hasBounds =
    options?.visibleLeft != null &&
    options?.visibleTop != null &&
    options?.visibleRight != null &&
    options?.visibleBottom != null;

  if (hasBounds) {
    const fitted = fitClusterToVisibleBounds(count, rightCol, topRow, {
      left: options.visibleLeft!,
      top: options.visibleTop!,
      right: options.visibleRight!,
      bottom: options.visibleBottom!,
    });
    rightCol = fitted.rightCol;
    topRow = fitted.topRow;
  }

  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % LAYOUT_COLS_PER_ROW;
    const row = Math.floor(i / LAYOUT_COLS_PER_ROW);
    positions.push({
      x: rightCol - col * LAYOUT_CELL_SPACING,
      y: topRow + row * LAYOUT_CELL_SPACING,
    });
  }
  return positions;
}

/** Place token centers in a grid anchored to the upper-left of the visible canvas. */
export function computeUpperLeftTokenGrid(
  count: number,
  options?: TokenGridLayoutOptions,
): { x: number; y: number }[] {
  const fallbackLeftCol = LAYOUT_MARGIN_CELLS + 1;
  const fallbackTopRow = LAYOUT_MARGIN_CELLS + 1;

  let leftCol =
    options?.anchorLeftCol != null ? options.anchorLeftCol : fallbackLeftCol;
  let topRow = options?.anchorTopRow != null ? options.anchorTopRow : fallbackTopRow;

  const hasBounds =
    options?.visibleLeft != null &&
    options?.visibleTop != null &&
    options?.visibleRight != null &&
    options?.visibleBottom != null;

  if (hasBounds) {
    const fitted = fitClusterToVisibleBoundsLeft(count, leftCol, topRow, {
      left: options.visibleLeft!,
      top: options.visibleTop!,
      right: options.visibleRight!,
      bottom: options.visibleBottom!,
    });
    leftCol = fitted.leftCol;
    topRow = fitted.topRow;
  }

  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % LAYOUT_COLS_PER_ROW;
    const row = Math.floor(i / LAYOUT_COLS_PER_ROW);
    positions.push({
      x: leftCol + col * LAYOUT_CELL_SPACING,
      y: topRow + row * LAYOUT_CELL_SPACING,
    });
  }
  return positions;
}
