/** When false on character.stats.custom, sync skips creating a map token for that PC. */
export const MAP_TOKEN_VISIBLE_KEY = 'mapTokenVisible';

export function isCharacterMapTokenVisible(character: {
  stats?: { custom?: Record<string, unknown> };
}): boolean {
  const custom = character.stats?.custom;
  if (custom && MAP_TOKEN_VISIBLE_KEY in custom) {
    return Boolean(custom[MAP_TOKEN_VISIBLE_KEY]);
  }
  return true;
}

export type MapTokenVisibilityContext = {
  isDm: boolean;
  initiativeActive: boolean;
  monstersVisibleOnMap: boolean;
};

/** Whether a map token should render for the current viewer. */
export function isMapTokenVisible(
  token: { kind: string; isDead?: boolean },
  ctx: MapTokenVisibilityContext,
): boolean {
  if (token.kind !== 'monster') return true;
  if (ctx.isDm) return true;
  if (token.isDead) return true;
  return ctx.initiativeActive || ctx.monstersVisibleOnMap;
}
