import { z } from 'zod';

import { DICE_ROLL_KINDS } from './dice-roll-kind.js';

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

export const gameSettingsSchema = z.object({
  gridFtPerCell: z.number().positive().default(5),
  playerTokenMovement: z.enum(['free', 'approval']).default('free'),
});

export const createGameSchema = z.object({
  title: z.string().min(1).max(120),
});

export const initiativeEndTurnSchema = z.object({
  characterId: z.string().uuid().optional(),
});

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
    startingFunds: z.number().optional(),
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

export const tokenMoveSchema = z.object({
  x: z.number(),
  y: z.number(),
  zone: z.enum(['map', 'holding']).optional(),
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

export const createGameMapSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  gridPreset: z.enum(['tactical', 'town', 'regional']).optional(),
});

export const patchGameMapSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  visible: z.boolean().optional(),
  gridPreset: z.enum(['tactical', 'town', 'regional']).optional(),
  dmDrawings: z.array(z.record(z.unknown())).max(500).optional(),
  clearImage: z.boolean().optional(),
  widthPx: z.coerce.number().int().min(0).max(20000).optional(),
  heightPx: z.coerce.number().int().min(0).max(20000).optional(),
  imageScale: z.coerce.number().min(0.1).max(5).optional(),
});

export const uploadGameMapImageFieldsSchema = z.object({
  widthPx: z.coerce.number().int().min(0).max(20000).optional(),
  heightPx: z.coerce.number().int().min(0).max(20000).optional(),
  imageScale: z.coerce.number().min(0.1).max(5).optional(),
});

export const setActiveMapSchema = z.object({
  mapId: z.string().uuid(),
});

/** Grid/layout coords may be negative when the viewport shows area outside the grid origin. */
const layoutGridCoord = z.coerce.number().finite();

export const layoutMapTokensSchema = z.object({
  anchorRightCol: layoutGridCoord.optional(),
  anchorTopRow: layoutGridCoord.optional(),
  visibleLeft: layoutGridCoord.optional(),
  visibleTop: layoutGridCoord.optional(),
  visibleRight: layoutGridCoord.optional(),
  visibleBottom: layoutGridCoord.optional(),
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

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const resendVerificationSchema = z.object({
  email: z.string().email().max(255),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(128),
});
