import { z } from 'zod';

import { DICE_ROLL_KINDS } from '../combat/dice-roll-kind.js';

export const diceRollRequestSchema = z.object({
  gameId: z.string().uuid(),
  characterId: z.string().uuid().optional(),
  notation: z.string().min(1).max(128),
  reason: z.string().max(256).optional(),
  rollKind: z.enum(DICE_ROLL_KINDS).optional(),
  targetType: z.enum(['character', 'monster', 'npc']).optional(),
  targetId: z.string().uuid().optional(),
});

export const applyDamageSchema = z.object({
  amount: z.coerce.number().int().min(1).max(9999),
  targetType: z.enum(['character', 'monster', 'npc']),
  targetId: z.string().uuid(),
  rollLogId: z.string().uuid().optional(),
});

export const diceRollQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(80),
});
