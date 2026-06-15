import {
  applyStackUsesConsume,
  formatStackUsesSummary,
  getStackUsesAvailable,
} from './item-uses.js';
import { CONSUMABLE_PRESETS_BY_NAME, normalizeItemName } from './consumable-presets.js';
import {
  CONSUMABLE_DEFAULTS,
  type CatalogItemLike,
  type ConsumableChoice,
  type ConsumableFlags,
  type ConsumableProperties,
  type ConsumableTrackKind,
  type LightSourceOption,
} from './consumable-types.js';

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

export { normalizeItems };
