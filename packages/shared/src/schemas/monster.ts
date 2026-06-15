import { z } from 'zod';

export const monsterCatalogQuerySchema = z.object({
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const customMonsterSchema = z.object({
  name: z.string().min(1).max(120),
  hitDice: z.string().min(1).max(32).default('1d8'),
  ac: z.coerce.number().int().min(1).max(40).default(12),
  attackBonus: z.coerce.number().int().min(-10).max(30).default(0),
  damage: z.string().min(1).max(32).default('1d6'),
  initMod: z.coerce.number().int().min(-10).max(20).default(0),
  speed: z.coerce.number().int().min(0).max(200).default(30),
  hpMax: z.coerce.number().int().min(1).max(9999),
});

export const spawnMonstersSchema = z
  .object({
    count: z.coerce.number().int().min(1).max(50).default(1),
    scaleLevel: z.coerce.number().int().min(0).max(20).default(1),
    catalogId: z.string().uuid().optional(),
    custom: customMonsterSchema.optional(),
    addToInitiative: z.boolean().optional().default(false),
  })
  .refine((d) => Boolean(d.catalogId) !== Boolean(d.custom), {
    message: 'Provide catalogId or custom stats, not both',
  });

const monsterSheetSchema = z.object({
  attacks: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        attackBonus: z.number(),
        damage: z.string(),
        range: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .max(20),
  specialAbilities: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .max(30),
});

export const patchGameMonsterSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  hpCurrent: z.coerce.number().int().min(-9999).max(9999).optional(),
  hpMax: z.coerce.number().int().min(1).max(9999).optional(),
  notes: z.string().max(2000).optional(),
  ac: z.coerce.number().int().min(1).max(40).optional(),
  attackBonus: z.coerce.number().int().min(-10).max(30).optional(),
  damage: z.string().max(32).optional(),
  initMod: z.coerce.number().int().min(-10).max(20).optional(),
  speed: z.coerce.number().int().min(0).max(200).optional(),
  sheet: monsterSheetSchema.optional(),
  stats: z.record(z.unknown()).optional(),
  combat: z.record(z.unknown()).optional(),
});

const monsterItemPatchSchema = z.object({
  category: z.enum(['weapon', 'armor', 'treasure', 'misc', 'disposable']),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0).max(9999).optional(),
  notes: z.string().max(500).optional(),
  properties: z.record(z.unknown()).optional(),
});

export const replaceMonsterItemsSchema = z.object({
  items: z.array(monsterItemPatchSchema).max(100),
});

export const upsertMonsterCatalogSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  baseLevel: z.coerce.number().int().min(0).max(20).default(1),
  hitDice: z.string().min(1).max(32).default('1d8'),
  ac: z.coerce.number().int().min(1).max(40).default(12),
  attackBonus: z.coerce.number().int().min(-10).max(30).default(0),
  damage: z.string().min(1).max(32).default('1d6'),
  initMod: z.coerce.number().int().min(-10).max(20).default(0),
  speed: z.coerce.number().int().min(0).max(200).default(30),
  hpAvg: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  sheet: monsterSheetSchema.optional(),
  stats: z.record(z.unknown()).optional(),
  combat: z.record(z.unknown()).optional(),
  lootPoolId: z.string().uuid().nullable().optional(),
});

export const upsertLootPoolSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  entries: z
    .array(
      z.object({
        name: z.string(),
        category: z.enum(['weapon', 'armor', 'treasure', 'misc', 'disposable']),
        quantity: z.number().int().min(0).optional(),
        weight: z.number().int().min(1).max(100),
        notes: z.string().optional(),
        properties: z.record(z.unknown()).optional(),
      }),
    )
    .max(50),
});
