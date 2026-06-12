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
