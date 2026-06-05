export type ConsumableTrackKind = 'food' | 'drink' | 'light';

/** Stored on character.stats.custom when a light source is actively in use. */
export const USING_LIGHT_SOURCE_KEY = 'usingLightSource';

export interface ConsumableFlags {
  food?: boolean;
  drink?: boolean;
  poisonous?: boolean;
  light?: boolean;
}

export interface CatalogItemLike {
  id?: string;
  category: string;
  name: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
}

export const CONSUMABLE_DEFAULTS: Record<
  ConsumableTrackKind,
  { name: string; properties: ConsumableFlags }
> = {
  food: { name: 'Rations (1 day)', properties: { food: true } },
  drink: { name: 'Waterskin', properties: { drink: true } },
  light: { name: 'Torch', properties: { light: true } },
};

const FLAG_KEY: Record<ConsumableTrackKind, keyof ConsumableFlags> = {
  food: 'food',
  drink: 'drink',
  light: 'light',
};

export function parseConsumableFlags(
  properties?: Record<string, unknown>,
): ConsumableFlags {
  if (!properties) return {};
  return {
    food: Boolean(properties.food),
    drink: Boolean(properties.drink),
    poisonous: Boolean(properties.poisonous),
    light: Boolean(properties.light),
  };
}

export function consumableFlagsToProperties(flags: ConsumableFlags): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (flags.food) out.food = true;
  if (flags.drink) out.drink = true;
  if (flags.poisonous) out.poisonous = true;
  if (flags.light) out.light = true;
  return out;
}

export function isTrackedConsumable(
  item: CatalogItemLike,
  kind: ConsumableTrackKind,
): boolean {
  if (item.category !== 'disposable') return false;
  const flags = parseConsumableFlags(item.properties);
  return Boolean(flags[FLAG_KEY[kind]]);
}

export function countConsumables(
  items: CatalogItemLike[],
  kind: ConsumableTrackKind,
): number {
  return items
    .filter((i) => isTrackedConsumable(i, kind))
    .reduce((sum, i) => sum + Math.max(0, i.quantity), 0);
}

export function formatConsumableTags(flags: ConsumableFlags): string {
  const tags: string[] = [];
  if (flags.food) tags.push('Food');
  if (flags.drink) tags.push('Drink');
  if (flags.poisonous) tags.push('Poisonous');
  if (flags.light) tags.push('Light source');
  return tags.length ? tags.join(', ') : '';
}

export function isUsingLightSource(character: {
  stats?: { custom?: Record<string, unknown> };
}): boolean {
  return Boolean(character.stats?.custom?.[USING_LIGHT_SOURCE_KEY]);
}

/** Returns a new items array with quantity adjusted for food/drink/light totals. */
export function adjustTrackedConsumables(
  items: CatalogItemLike[],
  kind: ConsumableTrackKind,
  delta: number,
): CatalogItemLike[] {
  if (delta === 0) return items;

  const next = items.map((i) => ({ ...i, properties: { ...(i.properties ?? {}) } }));

  if (delta > 0) {
    const idx = next.findIndex((i) => isTrackedConsumable(i, kind));
    if (idx >= 0) {
      next[idx] = { ...next[idx]!, quantity: next[idx]!.quantity + delta };
      return next;
    }
    const def = CONSUMABLE_DEFAULTS[kind];
    next.push({
      category: 'disposable',
      name: def.name,
      quantity: delta,
      notes: '',
      properties: { ...def.properties },
    });
    return next;
  }

  let remaining = -delta;
  for (let i = next.length - 1; i >= 0 && remaining > 0; i--) {
    const item = next[i]!;
    if (!isTrackedConsumable(item, kind)) continue;
    const take = Math.min(item.quantity, remaining);
    const newQty = item.quantity - take;
    remaining -= take;
    if (newQty <= 0) {
      next.splice(i, 1);
    } else {
      next[i] = { ...item, quantity: newQty };
    }
  }
  return next;
}
