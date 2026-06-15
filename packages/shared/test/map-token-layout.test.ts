import { describe, expect, test } from 'bun:test';
import {
  computeUpperLeftTokenGrid,
  computeUpperRightTokenGrid,
} from '../src/map-token-layout.js';

describe('computeUpperRightTokenGrid', () => {
  test('places count tokens in a right-anchored grid', () => {
    const positions = computeUpperRightTokenGrid(3);
    expect(positions).toHaveLength(3);
    expect(positions[0]!.x).toBeGreaterThan(positions[1]!.x);
    expect(positions[0]!.y).toBe(positions[1]!.y);
    expect(positions[2]!.y).toBeGreaterThanOrEqual(positions[0]!.y);
  });

  test('respects explicit anchors', () => {
    const positions = computeUpperRightTokenGrid(1, {
      anchorRightCol: 20,
      anchorTopRow: 4,
    });
    expect(positions[0]).toEqual({ x: 20, y: 4 });
  });
});

describe('computeUpperLeftTokenGrid', () => {
  test('places count tokens left-to-right', () => {
    const positions = computeUpperLeftTokenGrid(2, {
      anchorLeftCol: 2,
      anchorTopRow: 2,
    });
    expect(positions).toHaveLength(2);
    expect(positions[1]!.x).toBeGreaterThan(positions[0]!.x);
    expect(positions[0]!.y).toBe(2);
  });

  test('fits within visible bounds when provided', () => {
    const positions = computeUpperLeftTokenGrid(4, {
      anchorLeftCol: 100,
      anchorTopRow: 100,
      visibleLeft: 0,
      visibleTop: 0,
      visibleRight: 30,
      visibleBottom: 30,
    });
    for (const p of positions) {
      expect(p.x).toBeLessThanOrEqual(30);
      expect(p.y).toBeLessThanOrEqual(30);
    }
  });
});
