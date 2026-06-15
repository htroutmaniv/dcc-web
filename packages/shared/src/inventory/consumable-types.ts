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

export const DEFAULT_LIGHT_RADIUS_FT = 30;
