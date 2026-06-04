import { z } from 'zod';

export const diceRollRequestSchema = z.object({
  gameId: z.string().uuid(),
  characterId: z.string().uuid().optional(),
  notation: z.string().min(1).max(64),
  reason: z.string().max(256).optional(),
});

export const gameSettingsSchema = z.object({
  gridFtPerCell: z.number().positive().default(5),
  playerTokenMovement: z.enum(['free', 'approval']).default('free'),
});

export const createGameSchema = z.object({
  title: z.string().min(1).max(120),
});

export const patchCharacterSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  level: z.number().int().min(0).max(30).optional(),
  className: z.string().max(64).optional(),
  alignment: z.string().max(32).optional(),
  status: z.enum(['alive', 'dead']).optional(),
  stats: z.record(z.unknown()).optional(),
  combat: z.record(z.unknown()).optional(),
  notes: z.string().max(10000).optional(),
});

export const tokenMoveSchema = z.object({
  x: z.number(),
  y: z.number(),
  zone: z.enum(['map', 'holding']).optional(),
});

export const generateCharacterSchema = z.object({
  ownerUserId: z.string().uuid().optional(),
  level: z.number().int().min(0).max(10).default(0),
});
