import { describe, expect, test } from 'bun:test';
import { patchCharacterSchema } from '../src/schemas/character.js';

describe('patchCharacterSchema', () => {
  test('accepts startingFunds as display string from funnel generation', () => {
    const parsed = patchCharacterSchema.safeParse({
      stats: {
        custom: {
          startingFunds: '12 cp',
          usingLightSource: true,
          activeLightItemId: 'abc',
        },
      },
    });
    expect(parsed.success).toBe(true);
  });
});
