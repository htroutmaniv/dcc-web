import { z } from 'zod';

export const tokenMoveSchema = z.object({
  x: z.number(),
  y: z.number(),
  zone: z.enum(['map', 'holding']).optional(),
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
