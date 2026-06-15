import { z } from 'zod';

const patchItemSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(['weapon', 'armor', 'treasure', 'misc', 'disposable']),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0).max(9999).optional(),
  notes: z.string().max(500).optional(),
  properties: z.record(z.unknown()).optional(),
});

export const replaceCharacterItemsSchema = z.object({
  items: z.array(patchItemSchema).max(200),
});

const abilityScoreSchema = z.object({
  score: z.number(),
  modifier: z.number(),
});

/** Known keys on `character.stats.custom` — unknown keys allowed via passthrough until strict flip. */
export const characterStatsCustomSchema = z
  .object({
    activeInPlay: z.boolean().optional(),
    selectedWeaponId: z.string().max(64).optional(),
    selectedWeaponName: z.string().max(200).optional(),
    selectedArmorId: z.string().max(64).nullable().optional(),
    selectedShieldId: z.string().max(64).nullable().optional(),
    selectedArmorName: z.string().max(200).optional(),
    selectedShieldName: z.string().max(200).optional(),
    baseSpeed: z.number().optional(),
    usingLightSource: z.boolean().optional(),
    activeLightItemId: z.string().max(64).nullable().optional(),
    mapTokenVisible: z.boolean().optional(),
    /** Combat target ref (`monster:id`, `npc:id`, etc.) */
    attackTarget: z.string().max(128).optional(),
    attackTargetRef: z.string().max(128).optional(),
    occupation: z.string().max(120).optional(),
    race: z.string().max(64).optional(),
    startingFunds: z.string().max(32).optional(),
    luckySign: z.string().max(200).optional(),
    languages: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export const KNOWN_CHARACTER_STATS_CUSTOM_KEYS = [
  'activeInPlay',
  'selectedWeaponId',
  'selectedWeaponName',
  'selectedArmorId',
  'selectedShieldId',
  'selectedArmorName',
  'selectedShieldName',
  'baseSpeed',
  'usingLightSource',
  'activeLightItemId',
  'mapTokenVisible',
  'attackTarget',
  'attackTargetRef',
  'occupation',
  'race',
  'startingFunds',
  'luckySign',
  'languages',
] as const;

/** Soft warn for keys not yet in the strict schema (passthrough period). */
export function warnUnknownCharacterStatsCustomKeys(
  custom: Record<string, unknown> | undefined,
  log: { warn: (obj: object, msg?: string) => void },
): void {
  if (!custom) return;
  const known = new Set<string>(KNOWN_CHARACTER_STATS_CUSTOM_KEYS);
  for (const key of Object.keys(custom)) {
    if (!known.has(key)) {
      log.warn({ key }, 'Unknown character.stats.custom key');
    }
  }
}

export const characterStatsPatchSchema = z
  .object({
    abilities: z.record(abilityScoreSchema).optional(),
    saves: z.record(z.number()).optional(),
    speed: z.number().optional(),
    armorSpeedPenalty: z.number().optional(),
    movementModifiers: z
      .array(z.object({ label: z.string().max(120), feet: z.number() }))
      .optional(),
    initiative: z.number().optional(),
    custom: characterStatsCustomSchema.optional(),
  })
  .passthrough();

export const characterCombatCustomSchema = z
  .object({
    mortalRoundsRemaining: z.number().int().min(0).optional(),
    markedDead: z.boolean().optional(),
    lastDeathRound: z.number().int().optional(),
  })
  .passthrough();

export const characterCombatPatchSchema = z
  .object({
    ac: z.number().int().optional(),
    hpMax: z.number().int().min(0).optional(),
    hpCurrent: z.number().int().optional(),
    hpTemp: z.number().int().min(0).optional(),
    custom: characterCombatCustomSchema.optional(),
  })
  .passthrough();

export const patchCharacterSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  level: z.number().int().min(0).max(30).optional(),
  className: z.string().max(64).optional(),
  alignment: z.string().max(32).optional(),
  status: z.enum(['alive', 'dead', 'archived']).optional(),
  ownerUserId: z.string().uuid().optional(),
  stats: characterStatsPatchSchema.optional(),
  combat: characterCombatPatchSchema.optional(),
  notes: z.string().max(10000).optional(),
  items: z.array(patchItemSchema).optional(),
});

const raceFiltersSchema = z.object({
  noElves: z.boolean().optional().default(false),
  noDwarves: z.boolean().optional().default(false),
  noHalflings: z.boolean().optional().default(false),
});

export const itemCatalogQuerySchema = z.object({
  category: z.enum(['weapon', 'armor', 'treasure', 'misc', 'disposable']),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const createCharacterSchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('random'),
      ownerUserId: z.string().uuid().optional(),
      level: z.number().int().min(0).max(10).default(0),
      className: z.string().max(64).optional(),
    })
    .merge(raceFiltersSchema),
  z.object({
    mode: z.literal('manual'),
    ownerUserId: z.string().uuid().optional(),
    level: z.number().int().min(0).max(10).default(0),
    className: z.string().max(64).optional(),
    name: z.string().min(1).max(120).optional(),
  }),
]);
