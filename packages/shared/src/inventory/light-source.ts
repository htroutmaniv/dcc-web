import {
  ACTIVE_LIGHT_ITEM_ID_KEY,
  DEFAULT_LIGHT_RADIUS_FT,
  USING_LIGHT_SOURCE_KEY,
  type CatalogItemLike,
} from './consumable-types.js';
import {
  consumeFromItem,
  consumeFuel,
  countFuel,
  getAvailableUnits,
  getEffectiveConsumableProperties,
  isLanternLight,
  isLightSourceItem,
  isTorchLight,
  normalizeItems,
} from './consumable-parse.js';

export function isUsingLightSource(character: {
  stats?: { custom?: Record<string, unknown> };
}): boolean {
  return Boolean(character.stats?.custom?.[USING_LIGHT_SOURCE_KEY]);
}

/** Radius in feet for an item that emits light (torches, lanterns, etc.). */
export function getLightSourceRadiusFeet(item: CatalogItemLike): number {
  const props = getEffectiveConsumableProperties(item);
  if (props.lightRadiusFt != null && props.lightRadiusFt > 0) return props.lightRadiusFt;
  if (isLightSourceItem(item)) return DEFAULT_LIGHT_RADIUS_FT;
  return DEFAULT_LIGHT_RADIUS_FT;
}

/** When the character has a lit light source, returns its radius in feet. */
export function getCharacterLightRadiusFeet(character: {
  stats?: { custom?: Record<string, unknown> };
  items?: CatalogItemLike[];
}): number | null {
  if (!isUsingLightSource(character)) return null;
  const itemId = getActiveLightItemId(character);
  if (!itemId) return null;
  const item = (character.items ?? []).find((i) => i.id === itemId);
  if (!item || !isLightSourceItem(item)) return null;
  return getLightSourceRadiusFeet(item);
}

export function getActiveLightItemId(character: {
  stats?: { custom?: Record<string, unknown> };
}): string | undefined {
  const id = character.stats?.custom?.[ACTIVE_LIGHT_ITEM_ID_KEY];
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

/**
 * After inventory changes, keep the equipped light when the same row or another
 * torch / fuel for the same lantern type still has uses.
 */
export function resolveActiveLightItemId(
  items: CatalogItemLike[],
  previousActiveId: string | undefined,
  previousItems?: CatalogItemLike[],
): string | undefined {
  if (!previousActiveId) return undefined;
  const normalized = normalizeItems(items);
  const prevNorm = previousItems ? normalizeItems(previousItems) : normalized;
  const prevItem =
    prevNorm.find((i) => i.id === previousActiveId) ??
    normalized.find((i) => i.id === previousActiveId);

  if (!prevItem) {
    const torch = normalized.find((i) => isTorchLight(i) && getAvailableUnits(i) > 0);
    if (torch?.id) return torch.id;
    const lantern = normalized.find(isLanternLight);
    if (lantern?.id && countFuel(normalized) > 0) return lantern.id;
    return undefined;
  }

  if (isLanternLight(prevItem)) {
    const lantern =
      normalized.find((i) => i.id === previousActiveId && isLanternLight(i)) ??
      normalized.find(isLanternLight);
    if (lantern?.id && countFuel(normalized) > 0) return lantern.id;
    return undefined;
  }

  if (isTorchLight(prevItem)) {
    const same = normalized.find((i) => i.id === previousActiveId && isTorchLight(i));
    if (same && getAvailableUnits(same) > 0) return previousActiveId;
    const torch = normalized.find((i) => isTorchLight(i) && getAvailableUnits(i) > 0);
    return torch?.id;
  }

  return undefined;
}

/**
 * Turn on a light source: torch consumes itself; lantern consumes 1 fuel from inventory.
 */
export function activateLightSource(
  items: CatalogItemLike[],
  lightItemId: string,
): { items: CatalogItemLike[]; ok: boolean; message?: string } {
  let next = normalizeItems(items);
  const item = next.find((i) => i.id === lightItemId);
  if (!item) return { items, ok: false, message: 'Light source not found' };

  if (isTorchLight(item)) {
    return consumeFromItem(next, lightItemId, 1);
  }
  if (isLanternLight(item)) {
    return consumeFuel(next, 1);
  }
  return { items, ok: false, message: 'Not a light source' };
}

/** @deprecated Fuel is consumed automatically when activating lanterns */
export function refillLanternFromFuel(
  items: CatalogItemLike[],
  _lanternId: string,
  fuelId: string,
  units = 1,
): { items: CatalogItemLike[]; ok: boolean; message?: string } {
  return consumeFromItem(normalizeItems(items), fuelId, units);
}
