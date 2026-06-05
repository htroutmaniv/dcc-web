import {
  adjustTrackedConsumables,
  countConsumables,
  isUsingLightSource,
  USING_LIGHT_SOURCE_KEY,
  type ConsumableTrackKind,
} from '@dcc-web/shared';

export { isUsingLightSource, USING_LIGHT_SOURCE_KEY };
import type { Character, CharacterItem } from '../types/game';

export function getConsumableCounts(character: Character) {
  const items = character.items ?? [];
  return {
    food: countConsumables(items, 'food'),
    drink: countConsumables(items, 'drink'),
    light: countConsumables(items, 'light'),
  };
}

/** Adjust food/drink/light totals and return full item list for PUT /characters/:id/items */
export function buildItemsAfterConsumableDelta(
  character: Character,
  kind: ConsumableTrackKind,
  delta: number,
): Omit<CharacterItem, 'id'>[] {
  const adjusted = adjustTrackedConsumables(character.items ?? [], kind, delta);
  return adjusted.map((item) => ({
    category: item.category as CharacterItem['category'],
    name: item.name,
    quantity: item.quantity,
    notes: item.notes ?? '',
    properties: item.properties ?? {},
  }));
}
