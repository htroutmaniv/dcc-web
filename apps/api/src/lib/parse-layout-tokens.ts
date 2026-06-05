export type LayoutTokensRequest = {
  anchorRightCol?: number;
  anchorTopRow?: number;
  visibleLeft?: number;
  visibleTop?: number;
  visibleRight?: number;
  visibleBottom?: number;
};

function parseLayoutCoord(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Accepts negative grid coords (panned viewport). Intentionally not Zod — avoids stale shared schema cache. */
export function parseLayoutTokensBody(body: unknown): LayoutTokensRequest {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  return {
    anchorRightCol: parseLayoutCoord(raw.anchorRightCol),
    anchorTopRow: parseLayoutCoord(raw.anchorTopRow),
    visibleLeft: parseLayoutCoord(raw.visibleLeft),
    visibleTop: parseLayoutCoord(raw.visibleTop),
    visibleRight: parseLayoutCoord(raw.visibleRight),
    visibleBottom: parseLayoutCoord(raw.visibleBottom),
  };
}
