import { describe, expect, test } from 'bun:test';
import { isEmptyGamePatch, validateGamePatch } from '../src/game-patch.js';

describe('validateGamePatch', () => {
  test('accepts character upsert', () => {
    const patch = validateGamePatch({
      characters: { upserted: [{ id: 'c1', name: 'Bob' }] },
    });
    expect(patch.characters?.upserted).toHaveLength(1);
  });

  test('accepts map delete + settings activeMapId', () => {
    const patch = validateGamePatch({
      maps: { deletedIds: ['m-old'] },
      settings: { activeMapId: 'm-new' },
      map: { id: 'm-new', tokens: [] },
    });
    expect(patch.maps?.deletedIds).toEqual(['m-old']);
    expect(patch.settings?.activeMapId).toBe('m-new');
  });

  test('rejects empty patch', () => {
    expect(() => validateGamePatch({})).toThrow(/empty/);
  });

  test('rejects malformed deletedIds', () => {
    expect(() =>
      validateGamePatch({ monsters: { deletedIds: [1 as unknown as string] } }),
    ).toThrow(/strings/);
  });
});

describe('isEmptyGamePatch', () => {
  test('detects non-empty initiative null', () => {
    expect(isEmptyGamePatch({ initiative: null })).toBe(false);
  });

  test('detects empty settings object as empty', () => {
    expect(isEmptyGamePatch({ settings: {} })).toBe(true);
  });
});
