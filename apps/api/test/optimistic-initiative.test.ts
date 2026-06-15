import { describe, expect, test } from 'bun:test';
import {
  advanceInitiativeTurn,
  type GameInitiativeState,
  type InitiativeEntry,
} from '@dcc-web/shared';
import { OptimisticLockConflict, withOptimisticRetry } from '../src/lib/optimistic.js';

describe('withOptimisticRetry', () => {
  test('returns result on first success', async () => {
    const result = await withOptimisticRetry(async () => 'ok');
    expect(result).toBe('ok');
  });

  test('retries on OptimisticLockConflict then succeeds', async () => {
    let attempts = 0;
    const result = await withOptimisticRetry(async () => {
      attempts += 1;
      if (attempts < 2) throw new OptimisticLockConflict();
      return 'done';
    });
    expect(result).toBe('done');
    expect(attempts).toBe(2);
  });

  test('throws after max attempts', async () => {
    let attempts = 0;
    await expect(
      withOptimisticRetry(async () => {
        attempts += 1;
        throw new OptimisticLockConflict();
      }),
    ).rejects.toThrow(OptimisticLockConflict);
    expect(attempts).toBe(3);
  });
});

function charEntry(id: string): InitiativeEntry {
  return {
    entryId: id,
    kind: 'character',
    characterId: id,
    name: id,
    initiative: 10,
  };
}

function baseState(): GameInitiativeState {
  return {
    active: true,
    round: 1,
    turnIndex: 0,
    order: [charEntry('a'), charEntry('b')],
  };
}

/**
 * Simulates version-checked initiative persistence without a database.
 * Two concurrent advances must serialize so turnIndex advances twice.
 */
describe('concurrent initiative advance simulation', () => {
  test('two parallel advances both apply via optimistic retry', async () => {
    let version = 1;
    let state = baseState();
    let writeBarrier = Promise.resolve();

    async function persistAdvance(): Promise<void> {
      await withOptimisticRetry(async () => {
        const readVersion = version;
        const snapshot = structuredClone(state);
        await writeBarrier;
        const next = advanceInitiativeTurn(snapshot);
        const release = new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        });
        writeBarrier = release;
        await release;
        if (readVersion !== version) {
          throw new OptimisticLockConflict();
        }
        version += 1;
        state = next;
      });
    }

    await Promise.all([persistAdvance(), persistAdvance()]);

    expect(version).toBe(3);
    expect(state.turnIndex).toBe(0);
    expect(state.round).toBe(2);
  });
});
