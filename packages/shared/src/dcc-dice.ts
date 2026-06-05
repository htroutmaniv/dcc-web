/** Polyhedral dice used in Dungeon Crawl Classics (Zocchi dice). */
export const DCC_DIE_SIDES = [3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 30, 100] as const;

export type DccDieSides = (typeof DCC_DIE_SIDES)[number];

export type DiceTrayCounts = Record<number, number>;

export function emptyDiceTray(): DiceTrayCounts {
  const tray: DiceTrayCounts = {};
  for (const sides of DCC_DIE_SIDES) {
    tray[sides] = 0;
  }
  return tray;
}

/** Build NdM(+NdM…)(±K) notation from per-die counts. Returns null if no dice selected. */
export function buildDiceNotation(
  counts: DiceTrayCounts,
  modifier = 0,
): string | null {
  const parts = DCC_DIE_SIDES.filter((sides) => (counts[sides] ?? 0) > 0).map(
    (sides) => `${counts[sides]}d${sides}`,
  );
  if (parts.length === 0) return null;
  let notation = parts.join('+');
  if (modifier !== 0) {
    notation += modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }
  return notation;
}

export function totalDiceInTray(counts: DiceTrayCounts): number {
  return DCC_DIE_SIDES.reduce((sum, sides) => sum + (counts[sides] ?? 0), 0);
}
