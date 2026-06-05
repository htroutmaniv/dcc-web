import { diceRollRequestSchema } from '@dcc-web/shared';
import type { FastifyInstance } from 'fastify';
import { assertGameMember } from '../lib/game-access.js';
import { emitToGame } from '../lib/game-socket.js';
import { rollAndPersist } from '../services/dice.js';

export async function diceRoutes(app: FastifyInstance) {
  app.post('/dice/roll', { onRequest: [app.authenticate] }, async (request) => {
    const parsed = diceRollRequestSchema.safeParse(request.body);
    if (!parsed.success) return request.server.httpErrors.badRequest(parsed.error.message);

    const access = await assertGameMember(request.userId!, parsed.data.gameId);
    if (!access.ok) {
      throw request.server.httpErrors.createError(access.status, access.message);
    }

    const result = await rollAndPersist({
      gameId: parsed.data.gameId,
      userId: request.userId!,
      characterId: parsed.data.characterId,
      notation: parsed.data.notation,
      reason: parsed.data.reason,
    });

    emitToGame(request.server.io, parsed.data.gameId, 'dice:rolled', {
      result,
      actorUserId: request.userId,
      characterId: parsed.data.characterId,
    });

    return { result };
  });
}
