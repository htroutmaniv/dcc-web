import {
  applyStackUsesConsume,
  formatStackUsesSummary,
  getStackUsesAvailable,
} from './item-uses.js';

export type ConsumableTrackKind = 'food' | 'drink' | 'light';

export const USING_LIGHT_SOURCE_KEY = 'usingLightSource';
export const ACTIVE_LIGHT_ITEM_ID_KEY = 'activeLightItemId';

export interface ConsumableFlags {
  food?: boolean;
  poisonous?: boolean;
  /** Emits light when selected as active source */
  light?: boolean;
}

export interface ConsumableProperties extends ConsumableFlags {
  /** Uses per inventory unit (default 1). Oil flask might be 2; wand might be 5. */
  uses?: number;
  /** Reusable container (waterskin); uses capacity / usesRemaining for contents */
  vessel?: boolean;
  capacity?: number;
  /** Contents left in a vessel, or partial uses on current stack unit */
  usesRemaining?: number;
  unitLabel?: string;
  /** Oil etc. — spent when a requiresFuel light is used */
  fuel?: boolean;
  /** Lantern: draws fuel from inventory instead of internal storage */
  requiresFuel?: boolean;
  /** Remove when depleted (torch) */
  consumedWhenEmpty?: boolean;
  /** Illumination radius in feet while lit (default 30 for torches/lanterns). */
  lightRadiusFt?: number;
  /** @deprecated Legacy — treated as drink vessel */
  drink?: boolean;
  /** @deprecated Legacy — treated as fuel */
  lightFuel?: boolean;
}

export interface CatalogItemLike {
  id?: string;
  category: string;
  name: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
}

export interface ConsumableChoice {
  item: CatalogItemLike;
  available: number;
  summary: string;
}

export interface LightSourceOption {
  item: CatalogItemLike;
  label: string;
  canActivate: boolean;
  reason?: string;
}

export const CONSUMABLE_DEFAULTS: Record<
  ConsumableTrackKind,
  { name: string; properties: ConsumableProperties }
> = {
  food: { name: 'Rations (1 day)', properties: { food: true } },
  drink: {
    name: 'Waterskin',
    properties: { vessel: true, capacity: 3, usesRemaining: 3, unitLabel: 'day' },
  },
  light: { name: 'Torch', properties: { light: true, consumedWhenEmpty: true, lightRadiusFt: 30 } },
};

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase();
}

export const CONSUMABLE_PRESETS_BY_NAME: Record<string, ConsumableProperties> = {
  lantern: { light: true, requiresFuel: true, lightRadiusFt: 30 },
  'oil flask': { fuel: true, uses: 2 },
  waterskin: { vessel: true, capacity: 3, usesRemaining: 3, unitLabel: 'day' },
  torch: { light: true, consumedWhenEmpty: true, lightRadiusFt: 30 },
  'rations (1 day)': { food: true },
  'holy water': { vessel: true, capacity: 1, usesRemaining: 1, unitLabel: 'use' },
};

export function parseConsumableFlags(
  properties?: Record<string, unknown>,
): ConsumableFlags {
  if (!properties) return {};
  return {
    food: Boolean(properties.food),
    poisonous: Boolean(properties.poisonous),
    light: Boolean(properties.light),
  };
}

export const DEFAULT_LIGHT_RADIUS_FT = 30;

export function parseConsumableProperties(
  properties?: Record<string, unknown>,
): ConsumableProperties {
  const flags = parseConsumableFlags(properties);
  const cap = properties?.capacity;
  const usesMax = properties?.uses;
  const usesRem = properties?.usesRemaining;
  const legacyDrink = Boolean(properties?.drink);
  const legacyFuel = Boolean(properties?.lightFuel);
  const radiusRaw = properties?.lightRadiusFt ?? properties?.lightRangeFt ?? properties?.radiusFt;
  const lightRadiusFt =
    typeof radiusRaw === 'number' && radiusRaw > 0 ? Math.floor(radiusRaw) : undefined;
  return {
    ...flags,
    uses: typeof usesMax === 'number' && usesMax > 0 ? Math.floor(usesMax) : undefined,
    vessel: Boolean(properties?.vessel) || (legacyDrink && !flags.light),
    capacity: typeof cap === 'number' && cap > 0 ? cap : undefined,
    usesRemaining: typeof usesRem === 'number' && usesRem >= 0 ? Math.floor(usesRem) : undefined,
    unitLabel: typeof properties?.unitLabel === 'string' ? properties.unitLabel : undefined,
    fuel: Boolean(properties?.fuel) || legacyFuel,
    requiresFuel: Boolean(properties?.requiresFuel),
    consumedWhenEmpty: Boolean(properties?.consumedWhenEmpty),
    lightRadiusFt,
    drink: legacyDrink,
    lightFuel: legacyFuel,
  };
}

export function getEffectiveConsumableProperties(
  item: CatalogItemLike,
): ConsumableProperties {
  const parsed = parseConsumableProperties(item.properties);
  const preset = CONSUMABLE_PRESETS_BY_NAME[normalizeItemName(item.name)];
  if (!preset) return parsed;
  const cap = parsed.capacity ?? preset.capacity;
  const usesMax = parsed.uses ?? preset.uses ?? 1;
  const usesRem = parsed.usesRemaining ?? preset.usesRemaining ?? cap;
  return {
    ...preset,
    ...parsed,
    uses: usesMax,
    capacity: cap,
    usesRemaining: usesRem,
    vessel: parsed.vessel || preset.vessel || false,
    fuel: parsed.fuel || preset.fuel || false,
    light: parsed.light || preset.light || false,
    requiresFuel: parsed.requiresFuel || preset.requiresFuel || false,
    food: parsed.food || preset.food || false,
    lightRadiusFt: parsed.lightRadiusFt ?? preset.lightRadiusFt,
  };
}

export function consumablePropertiesToRecord(
  props: ConsumableProperties,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (props.food) out.food = true;
  if (props.poisonous) out.poisonous = true;
  if (props.light) out.light = true;
  if (props.uses != null && props.uses !== 1) out.uses = props.uses;
  else if (props.uses === 1) out.uses = 1;
  if (props.vessel) out.vessel = true;
  if (props.capacity != null) out.capacity = props.capacity;
  if (props.usesRemaining != null) out.usesRemaining = props.usesRemaining;
  if (props.unitLabel) out.unitLabel = props.unitLabel;
  if (props.fuel) out.fuel = true;
  if (props.requiresFuel) out.requiresFuel = true;
  if (props.consumedWhenEmpty) out.consumedWhenEmpty = true;
  if (props.lightRadiusFt != null) out.lightRadiusFt = props.lightRadiusFt;
  return out;
}

/** @deprecated Use consumablePropertiesToRecord */
export function consumableFlagsToProperties(flags: ConsumableFlags): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (flags.food) out.food = true;
  if (flags.poisonous) out.poisonous = true;
  if (flags.light) out.light = true;
  return out;
}

export function normalizeItemForConsumables(item: CatalogItemLike): CatalogItemLike {
  const preset = CONSUMABLE_PRESETS_BY_NAME[normalizeItemName(item.name)];
  if (!preset && item.category !== 'disposable') return item;
  const props = getEffectiveConsumableProperties(item);
  if (
    !preset &&
    !props.food &&
    !props.vessel &&
    !props.fuel &&
    !props.light
  ) {
    return item;
  }
  return {
    ...item,
    category: 'disposable',
    properties: consumablePropertiesToRecord(props),
  };
}

function normalizeItems(items: CatalogItemLike[]): CatalogItemLike[] {
  return items.map(normalizeItemForConsumables);
}

function isConsumableCategory(item: CatalogItemLike): boolean {
  if (item.category === 'disposable') return true;
  return CONSUMABLE_PRESETS_BY_NAME[normalizeItemName(item.name)] != null;
}

export function isFuelItem(item: CatalogItemLike): boolean {
  if (!isConsumableCategory(item)) return false;
  const p = getEffectiveConsumableProperties(item);
  if (p.fuel) return true;
  const n = normalizeItemName(item.name);
  return n.includes('oil') && !n.includes('lantern');
}

export function isDrinkVessel(item: CatalogItemLike): boolean {
  if (!isConsumableCategory(item)) return false;
  const p = getEffectiveConsumableProperties(item);
  return Boolean(p.vessel) && !p.light && !p.fuel;
}

export function isFoodItem(item: CatalogItemLike): boolean {
  if (!isConsumableCategory(item)) return false;
  return Boolean(getEffectiveConsumableProperties(item).food);
}

export function isTorchLight(item: CatalogItemLike): boolean {
  if (!isConsumableCategory(item)) return false;
  const p = getEffectiveConsumableProperties(item);
  return Boolean(p.light) && !p.requiresFuel;
}

export function isLanternLight(item: CatalogItemLike): boolean {
  if (!isConsumableCategory(item)) return false;
  const p = getEffectiveConsumableProperties(item);
  return Boolean(p.light) && Boolean(p.requiresFuel);
}

export function isLightSourceItem(item: CatalogItemLike): boolean {
  return isTorchLight(item) || isLanternLight(item);
}

/** @deprecated Use isDrinkVessel */
export function isDrinkItem(item: CatalogItemLike): boolean {
  return isDrinkVessel(item);
}

/** @deprecated Use isFuelItem */
export function isLightFuelItem(item: CatalogItemLike): boolean {
  return isFuelItem(item);
}

export function isTrackedConsumable(
  item: CatalogItemLike,
  kind: ConsumableTrackKind,
): boolean {
  if (!isConsumableCategory(item)) return false;
  switch (kind) {
    case 'food':
      return isFoodItem(item);
    case 'drink':
      return isDrinkVessel(item);
    case 'light':
      return isLightSourceItem(item);
    default:
      return false;
  }
}

export function getAvailableUnits(item: CatalogItemLike): number {
  if (!isConsumableCategory(item)) return 0;
  const p = getEffectiveConsumableProperties(item);
  if (p.vessel) {
    const cap = p.capacity ?? 1;
    const contents = p.usesRemaining ?? cap;
    return Math.max(0, Math.min(contents, cap * Math.max(1, item.quantity)));
  }
  const props = consumablePropertiesToRecord(p);
  return getStackUsesAvailable({ quantity: item.quantity, properties: props });
}

export function formatConsumableRemaining(item: CatalogItemLike): string {
  const p = getEffectiveConsumableProperties(item);
  const available = getAvailableUnits(item);
  if (p.vessel) {
    const cap = p.capacity ?? 1;
    const unit = p.unitLabel ?? 'use';
    const plural = available === 1 ? unit : `${unit}s`;
    return `${available}/${cap} ${plural}`;
  }
  return formatStackUsesSummary({
    quantity: item.quantity,
    properties: consumablePropertiesToRecord(p),
  });
}

export function countFuel(items: CatalogItemLike[]): number {
  return normalizeItems(items)
    .filter(isFuelItem)
    .reduce((sum, i) => sum + getAvailableUnits(i), 0);
}

export function countConsumables(
  items: CatalogItemLike[],
  kind: ConsumableTrackKind,
): number {
  if (kind === 'light') {
    const normalized = normalizeItems(items);
    const torches = normalized
      .filter(isTorchLight)
      .reduce((sum, i) => sum + getAvailableUnits(i), 0);
    const lanterns = normalized.filter(isLanternLight).length;
    const fuel = countFuel(normalized);
    return torches + (lanterns > 0 && fuel > 0 ? fuel : 0);
  }
  return normalizeItems(items)
    .filter((i) => isTrackedConsumable(i, kind))
    .reduce((sum, i) => sum + getAvailableUnits(i), 0);
}

export function listConsumableChoices(
  items: CatalogItemLike[],
  kind: ConsumableTrackKind,
): ConsumableChoice[] {
  return normalizeItems(items)
    .filter((i) => isTrackedConsumable(i, kind))
    .map((item) => ({
      item,
      available: getAvailableUnits(item),
      summary: formatConsumableRemaining(item),
    }))
    .filter((c) => c.available > 0);
}

export function listLightSourceOptions(items: CatalogItemLike[]): LightSourceOption[] {
  const normalized = normalizeItems(items);
  const fuel = countFuel(normalized);
  const options: LightSourceOption[] = [];

  for (const item of normalized) {
    if (isTorchLight(item)) {
      const available = getAvailableUnits(item);
      options.push({
        item,
        label: `${item.name} (${formatConsumableRemaining(item)})`,
        canActivate: available > 0,
        reason: available > 0 ? undefined : 'No torches left',
      });
    }
    if (isLanternLight(item)) {
      options.push({
        item,
        label: `${item.name} (fuel available: ${fuel})`,
        canActivate: fuel > 0,
        reason: fuel > 0 ? undefined : 'No fuel',
      });
    }
  }
  return options;
}

/** Whether the active light can expend 1 torch or 1 fuel right now. */
export function canExpendLightSource(
  items: CatalogItemLike[],
  lightItemId: string,
): { ok: boolean; message?: string } {
  const normalized = normalizeItems(items);
  const item = normalized.find((i) => i.id === lightItemId);
  if (!item) return { ok: false, message: 'Light source not found' };
  if (isTorchLight(item)) {
    return getAvailableUnits(item) > 0
      ? { ok: true }
      : { ok: false, message: 'No torches left' };
  }
  if (isLanternLight(item)) {
    return countFuel(normalized) > 0
      ? { ok: true }
      : { ok: false, message: 'No fuel left' };
  }
  return { ok: false, message: 'Not a light source' };
}

export function formatConsumableTags(props: ConsumableProperties): string {
  const tags: string[] = [];
  if (props.food) tags.push('Food');
  if (props.vessel && !props.light && !props.fuel) tags.push('Vessel (drink)');
  if (props.fuel) tags.push('Fuel');
  if ((props.uses ?? 1) > 1) tags.push(`${props.uses} uses each`);
  if (props.light) tags.push(props.requiresFuel ? 'Light (needs fuel)' : 'Light');
  if (props.poisonous) tags.push('Poisonous');
  return tags.length ? tags.join(', ') : '';
}

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

function setUsesRemaining(item: CatalogItemLike, uses: number): CatalogItemLike {
  const props = getEffectiveConsumableProperties(item);
  return normalizeItemForConsumables({
    ...item,
    properties: consumablePropertiesToRecord({ ...props, usesRemaining: uses }),
  });
}

function removeItemAt(items: CatalogItemLike[], index: number): CatalogItemLike[] {
  const next = [...items];
  next.splice(index, 1);
  return next;
}

/** Consume from a specific item (food stack, drink vessel, torch, or fuel stack). */
export function consumeFromItem(
  items: CatalogItemLike[],
  itemId: string,
  units = 1,
): { items: CatalogItemLike[]; ok: boolean; message?: string } {
  let next = normalizeItems(items);
  const idx = next.findIndex((i) => i.id === itemId);
  if (idx < 0) return { items, ok: false, message: 'Item not found' };

  const item = next[idx]!;
  const available = getAvailableUnits(item);
  if (available < units) {
    return { items, ok: false, message: 'Not enough remaining' };
  }

  const p = getEffectiveConsumableProperties(item);

  if (p.vessel) {
    const cap = p.capacity ?? 1;
    const current = p.usesRemaining ?? cap;
    const after = current - units;
    if (after > 0 || !p.consumedWhenEmpty) {
      next[idx] = setUsesRemaining(item, Math.max(0, after));
    } else {
      next = removeItemAt(next, idx);
    }
  } else {
    const props = consumablePropertiesToRecord(p);
    const updated = applyStackUsesConsume(
      { quantity: item.quantity, properties: props },
      units,
    );
    if (!updated) {
      next = removeItemAt(next, idx);
    } else {
      next[idx] = normalizeItemForConsumables({
        ...item,
        quantity: updated.quantity,
        properties: updated.properties,
      });
    }
  }

  return { items: next, ok: true };
}

/** Spend fuel from any fuel item in inventory (first available stacks). */
export function consumeFuel(
  items: CatalogItemLike[],
  units = 1,
): { items: CatalogItemLike[]; ok: boolean; message?: string } {
  let next = normalizeItems(items);
  let remaining = units;
  for (const item of next) {
    if (remaining <= 0) break;
    if (!isFuelItem(item) || !item.id) continue;
    const take = Math.min(remaining, getAvailableUnits(item));
    if (take <= 0) continue;
    const res = consumeFromItem(next, item.id, take);
    if (!res.ok) return res;
    next = res.items;
    remaining -= take;
  }
  if (remaining > 0) {
    return { items, ok: false, message: 'No fuel remaining' };
  }
  return { items: next, ok: true };
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

export function adjustTrackedConsumables(
  items: CatalogItemLike[],
  kind: ConsumableTrackKind,
  delta: number,
): CatalogItemLike[] {
  if (delta === 0) return items;

  let next = normalizeItems(items);

  if (delta > 0) {
    const idx = next.findIndex((i) => isTrackedConsumable(i, kind));
    if (idx >= 0) {
      const item = next[idx]!;
      const p = getEffectiveConsumableProperties(item);
      if (p.vessel) {
        const cap = p.capacity ?? 1;
        const uses = (p.usesRemaining ?? cap) + delta;
        next[idx] = setUsesRemaining(item, Math.min(cap, uses));
      } else {
        next[idx] = { ...item, quantity: item.quantity + delta };
      }
      return next;
    }
    const def = CONSUMABLE_DEFAULTS[kind];
    const props = { ...def.properties };
    if (props.vessel && props.capacity != null) {
      props.usesRemaining = props.capacity;
    }
    next.push({
      category: 'disposable',
      name: def.name,
      quantity: 1,
      notes: '',
      properties: consumablePropertiesToRecord(props),
    });
    return next;
  }

  let remaining = -delta;
  for (let i = next.length - 1; i >= 0 && remaining > 0; i--) {
    const item = next[i]!;
    if (!isTrackedConsumable(item, kind)) continue;
    const available = getAvailableUnits(item);
    const take = Math.min(available, remaining);
    if (!item.id) continue;
    const res = consumeFromItem(next, item.id, take);
    if (res.ok) {
      next = res.items;
      remaining -= take;
    }
  }
  return next;
}
