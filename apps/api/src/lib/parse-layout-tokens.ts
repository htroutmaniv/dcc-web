export type LayoutTokenKind = 'pc' | 'monster';

export type LayoutTokensRequest = {
  kinds?: LayoutTokenKind[];
  anchorRightCol?: number;
  anchorLeftCol?: number;
  anchorTopRow?: number;
  visibleLeft?: number;
  visibleTop?: number;
  visibleRight?: number;
  visibleBottom?: number;
};

function parseLayoutKinds(value: unknown): LayoutTokenKind[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const kinds = value.filter((k): k is LayoutTokenKind => k === 'pc' || k === 'monster');
  return kinds.length > 0 ? kinds : undefined;
}

function parseLayoutCoord(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Accepts negative grid coords (panned viewport). Intentionally not Zod — avoids stale shared schema cache. */
export function parseLayoutTokensBody(body: unknown): LayoutTokensRequest {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  return {
    kinds: parseLayoutKinds(raw.kinds),
    anchorRightCol: parseLayoutCoord(raw.anchorRightCol),
    anchorLeftCol: parseLayoutCoord(raw.anchorLeftCol),
    anchorTopRow: parseLayoutCoord(raw.anchorTopRow),
    visibleLeft: parseLayoutCoord(raw.visibleLeft),
    visibleTop: parseLayoutCoord(raw.visibleTop),
    visibleRight: parseLayoutCoord(raw.visibleRight),
    visibleBottom: parseLayoutCoord(raw.visibleBottom),
  };
}
