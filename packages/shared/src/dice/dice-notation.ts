import type { DiceRollResult } from '../types.js';

const SINGLE_NOTATION_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;
const DIE_PART_RE = /(\d+)d(\d+)/gi;

export interface ParsedDiePart {
  count: number;
  sides: number;
}

/** Parse one or more NdM groups plus optional trailing ±K modifier. */
export function parseCompoundNotation(notation: string): {
  parts: ParsedDiePart[];
  modifier: number;
} {
  const normalized = notation.replace(/\s/g, '').toLowerCase();
  if (!normalized) {
    throw new Error('Invalid dice notation: empty');
  }

  const parts: ParsedDiePart[] = [];
  let match: RegExpExecArray | null;
  DIE_PART_RE.lastIndex = 0;
  while ((match = DIE_PART_RE.exec(normalized)) !== null) {
    parts.push({
      count: Number.parseInt(match[1], 10),
      sides: Number.parseInt(match[2], 10),
    });
  }

  if (parts.length === 0) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const remainder = normalized.replace(DIE_PART_RE, '').replace(/\+/g, '');
  let modifier = 0;
  if (remainder && remainder !== '+') {
    modifier = Number.parseInt(remainder, 10);
    if (Number.isNaN(modifier)) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }
  }

  return { parts, modifier };
}

/** Parse simple NdM(+/-K) notation. Throws on invalid input. */
export function parseDiceNotation(notation: string): {
  count: number;
  sides: number;
  modifier: number;
} {
  const normalized = notation.replace(/\s/g, '').toLowerCase();
  const match = SINGLE_NOTATION_RE.exec(normalized);
  if (!match) {
    const compound = parseCompoundNotation(notation);
    if (compound.parts.length !== 1) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }
    return { ...compound.parts[0]!, modifier: compound.modifier };
  }
  return {
    count: Number.parseInt(match[1], 10),
    sides: Number.parseInt(match[2], 10),
    modifier: match[3] ? Number.parseInt(match[3], 10) : 0,
  };
}

function validatePart(count: number, sides: number): void {
  if (!Number.isFinite(count) || !Number.isFinite(sides)) {
    throw new Error('Invalid dice notation: non-numeric count or sides');
  }
  if (count < 1 || count > 100) throw new Error('Die count out of range');
  if (sides < 2 || sides > 1000) throw new Error('Die sides out of range');
}

/** Roll dice using injected RNG (server passes crypto random). */
export function rollDice(
  notation: string,
  randomInt: (min: number, max: number) => number,
): DiceRollResult {
  const { parts, modifier } = parseCompoundNotation(notation);
  const rolls: number[] = [];

  for (const { count, sides } of parts) {
    validatePart(count, sides);
    for (let i = 0; i < count; i++) {
      rolls.push(randomInt(1, sides));
    }
  }

  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { notation, rolls, modifier, total };
}
