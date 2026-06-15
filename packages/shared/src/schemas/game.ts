import { z } from 'zod';

export const gameSettingsSchema = z.object({
  gridFtPerCell: z.number().positive().default(5),
  playerTokenMovement: z.enum(['free', 'approval']).default('free'),
});

export const createGameSchema = z.object({
  title: z.string().min(1).max(120),
});

export const patchGameSettingsSchema = z.object({
  monstersVisibleOnMap: z.boolean().optional(),
  sharedMonsterInitiative: z.boolean().optional(),
  hideMonsterAcInRollLog: z.boolean().optional(),
});

export const transferInventoryItemSchema = z.object({
  sourceType: z.enum(['character', 'monster']),
  sourceId: z.string().uuid(),
  sourceItemId: z.string().uuid(),
  targetType: z.enum(['character', 'monster']),
  targetId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(9999).optional(),
});
