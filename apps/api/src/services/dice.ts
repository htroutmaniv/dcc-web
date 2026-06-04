import { rollDice } from '@dcc-web/shared';
import { secureRandomInt } from '../lib/rng.js';
import { prisma } from '../lib/prisma.js';

export async function rollAndPersist(params: {
  gameId: string;
  userId: string;
  characterId?: string;
  notation: string;
  reason?: string;
}) {
  const result = rollDice(params.notation, secureRandomInt);
  const row = await prisma.diceRoll.create({
    data: {
      gameId: params.gameId,
      userId: params.userId,
      characterId: params.characterId,
      notation: result.notation,
      rolls: result.rolls,
      modifier: result.modifier,
      total: result.total,
      reason: params.reason,
    },
  });
  return { ...result, id: row.id, createdAt: row.createdAt };
}
