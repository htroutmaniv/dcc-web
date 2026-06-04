import type { DiceRollResult } from './types.js';

const NOTATION_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

/** Parse simple NdM(+/-K) notation. Throws on invalid input. */
export function parseDiceNotation(notation: string): {
  count: number;
  sides: number;
  modifier: number;
} {
  const normalized = notation.replace(/\s/g, '').toLowerCase();
  const match = NOTATION_RE.exec(normalized);
  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }
  return {
    count: Number.parseInt(match[1], 10),
    sides: Number.parseInt(match[2], 10),
    modifier: match[3] ? Number.parseInt(match[3], 10) : 0,
  };
}

/** Roll dice using injected RNG (server passes crypto random). */
export function rollDice(
  notation: string,
  randomInt: (min: number, max: number) => number,
): DiceRollResult {
  const { count, sides, modifier } = parseDiceNotation(notation);
  if (count < 1 || count > 100) throw new Error('Die count out of range');
  if (sides < 2 || sides > 1000) throw new Error('Die sides out of range');

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(randomInt(1, sides));
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { notation, rolls, modifier, total };
}
