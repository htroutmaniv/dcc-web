import { describe, expect, test } from 'bun:test';
import {
  ACTIVE_LIGHT_ITEM_ID_KEY,
  DEFAULT_LIGHT_RADIUS_FT,
  getCharacterLightRadiusFeet,
  getLightSourceRadiusFeet,
  resolveActiveLightItemId,
  USING_LIGHT_SOURCE_KEY,
} from '../src/consumables.js';
import type { CatalogItemLike } from '../src/consumables.js';

function torch(id: string, uses = 3): CatalogItemLike {
  return {
    id,
    category: 'disposable',
    name: 'Torch',
    quantity: 1,
    properties: { light: true, consumedWhenEmpty: true, usesRemaining: uses },
  };
}

describe('getLightSourceRadiusFeet', () => {
  test('uses explicit lightRadiusFt when set', () => {
    const item: CatalogItemLike = {
      id: 'l1',
      category: 'disposable',
      name: 'Lantern',
      properties: { light: true, requiresFuel: true, lightRadiusFt: 40 },
    };
    expect(getLightSourceRadiusFeet(item)).toBe(40);
  });

  test('defaults torches to DEFAULT_LIGHT_RADIUS_FT', () => {
    expect(getLightSourceRadiusFeet(torch('t1'))).toBe(DEFAULT_LIGHT_RADIUS_FT);
  });
});

describe('getCharacterLightRadiusFeet', () => {
  test('returns null when not using light', () => {
    expect(getCharacterLightRadiusFeet({ stats: {}, items: [torch('t1')] })).toBeNull();
  });

  test('returns radius for lit torch', () => {
    const radius = getCharacterLightRadiusFeet({
      stats: {
        custom: {
          [USING_LIGHT_SOURCE_KEY]: true,
          [ACTIVE_LIGHT_ITEM_ID_KEY]: 't1',
        },
      },
      items: [torch('t1')],
    });
    expect(radius).toBe(DEFAULT_LIGHT_RADIUS_FT);
  });
});

describe('resolveActiveLightItemId', () => {
  test('keeps same torch when still available', () => {
    const items = [torch('t1', 2)];
    expect(resolveActiveLightItemId(items, 't1', items)).toBe('t1');
  });

  test('falls back to another torch when previous depleted', () => {
    const prev = [torch('t1', 0)];
    const next = [torch('t1', 0), torch('t2', 2)];
    expect(resolveActiveLightItemId(next, 't1', prev)).toBe('t2');
  });

  test('returns undefined when no torches remain', () => {
    const items = [torch('t1', 0)];
    expect(resolveActiveLightItemId(items, 't1', items)).toBeUndefined();
  });
});
