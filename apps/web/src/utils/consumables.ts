import {
  activateLightSource,
  ACTIVE_LIGHT_ITEM_ID_KEY,
  adjustTrackedConsumables,
  consumeFromItem,
  countConsumables,
  canExpendLightSource,
  countFuel,
  isUsingLightSource,
  listLightSourceOptions,
  normalizeItemForConsumables,
  USING_LIGHT_SOURCE_KEY,
  type CatalogItemLike,
  type ConsumableTrackKind,
} from '@dcc-web/shared';

export {
  isUsingLightSource,
  USING_LIGHT_SOURCE_KEY,
  ACTIVE_LIGHT_ITEM_ID_KEY,
  countConsumables,
  countFuel,
  canExpendLightSource,
  listLightSourceOptions,
  normalizeItemForConsumables,
};

import type { Character, CharacterItem } from '../types/game';

function toItemPayload(items: CatalogItemLike[]): CharacterItem[] {
  return items.map((item) => ({
    ...(item.id ? { id: item.id } : {}),
    category: item.category as CharacterItem['category'],
    name: item.name,
    quantity: item.quantity,
    notes: item.notes ?? '',
    properties: item.properties ?? {},
  }));
}

export function getConsumableCounts(character: Character) {
  const items = character.items ?? [];
  return {
    food: countConsumables(items, 'food'),
    drink: countConsumables(items, 'drink'),
    fuel: countFuel(items),
    light: countConsumables(items, 'light'),
  };
}

export function buildItemsAfterConsume(
  character: Character,
  itemId: string,
  units = 1,
): { ok: boolean; items: CharacterItem[]; message?: string } {
  const result = consumeFromItem(character.items ?? [], itemId, units);
  if (!result.ok) {
    return { ok: false, items: toItemPayload(character.items ?? []), message: result.message };
  }
  return { ok: true, items: toItemPayload(result.items) };
}

export function buildItemsAfterActivateLight(
  character: Character,
  lightItemId: string,
): { ok: boolean; items: CharacterItem[]; message?: string } {
  const result = activateLightSource(character.items ?? [], lightItemId);
  if (!result.ok) {
    return { ok: false, items: toItemPayload(character.items ?? []), message: result.message };
  }
  return { ok: true, items: toItemPayload(result.items) };
}

/** @deprecated */
export function buildItemsAfterLanternRefill(
  character: Character,
  _lanternId: string,
  fuelId: string,
  units = 1,
): { ok: boolean; items: CharacterItem[]; message?: string } {
  return buildItemsAfterConsume(character, fuelId, units);
}

/** @deprecated */
export function buildItemsAfterConsumableDelta(
  character: Character,
  kind: ConsumableTrackKind,
  delta: number,
): CharacterItem[] {
  const adjusted = adjustTrackedConsumables(character.items ?? [], kind, delta);
  return toItemPayload(adjusted);
}
