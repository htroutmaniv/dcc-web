import { z } from 'zod';

export const initiativeEndTurnSchema = z.object({
  characterId: z.string().uuid().optional(),
});
