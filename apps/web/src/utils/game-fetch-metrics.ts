/** Dev/regression counter for full-list REST reloads (not patch applies). */

export type FullListFetchKind = 'detail' | 'characters' | 'monsters' | 'maps' | 'diceRolls';

const counts: Record<FullListFetchKind, number> = {
  detail: 0,
  characters: 0,
  monsters: 0,
  maps: 0,
  diceRolls: 0,
};

let windowStartedAt = Date.now();

export function recordFullListFetch(kind: FullListFetchKind): void {
  counts[kind] += 1;
}

export function getFullListFetchMetrics(): {
  counts: Record<FullListFetchKind, number>;
  windowStartedAt: number;
  total: number;
} {
  const total =
    counts.detail +
    counts.characters +
    counts.monsters +
    counts.maps +
    counts.diceRolls;
  return { counts: { ...counts }, windowStartedAt, total };
}

export function resetFullListFetchMetrics(): void {
  for (const key of Object.keys(counts) as FullListFetchKind[]) {
    counts[key] = 0;
  }
  windowStartedAt = Date.now();
}
