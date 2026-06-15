import { describe, expect, test } from 'bun:test';
import { parseCompoundNotation, parseDiceNotation, rollDice } from '../src/dice/dice-notation.js';

describe('parseDiceNotation', () => {
  test('parses simple notation', () => {
    expect(parseDiceNotation('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
    expect(parseDiceNotation('1d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
  });

  test('throws on invalid notation', () => {
    expect(() => parseDiceNotation('')).toThrow();
    expect(() => parseDiceNotation('not-dice')).toThrow();
  });
});

describe('parseCompoundNotation', () => {
  test('parses multiple die groups', () => {
    const { parts, modifier } = parseCompoundNotation('1d8+1d6+2');
    expect(parts).toEqual([
      { count: 1, sides: 8 },
      { count: 1, sides: 6 },
    ]);
    expect(modifier).toBe(2);
  });
});

describe('rollDice', () => {
  test('uses injected RNG deterministically', () => {
    let call = 0;
    const values = [3, 5];
    const result = rollDice('2d6', () => values[call++] ?? 1);
    expect(result.rolls).toEqual([3, 5]);
    expect(result.total).toBe(8);
    expect(result.modifier).toBe(0);
  });

  test('applies modifier to total', () => {
    const result = rollDice('1d20+5', () => 12);
    expect(result.total).toBe(17);
    expect(result.modifier).toBe(5);
  });
});
