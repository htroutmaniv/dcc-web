import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';

const MAP_UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'maps');
const MOVEMENT_REQUEST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Keep only the N most recent dice rolls per game. */
export async function pruneDiceRolls(
  maxPerGame = config.diceRollRetentionPerGame,
): Promise<number> {
  if (!Number.isFinite(maxPerGame) || maxPerGame < 1) return 0;

  const result = await prisma.$executeRaw`
    DELETE FROM dice_rolls
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY created_at DESC) AS rn
        FROM dice_rolls
      ) ranked
      WHERE rn > ${maxPerGame}
    )
  `;
  return Number(result);
}

/** Remove accepted/rejected movement requests resolved more than 24h ago. */
export async function pruneMovementRequests(): Promise<number> {
  const cutoff = new Date(Date.now() - MOVEMENT_REQUEST_MAX_AGE_MS);
  const result = await prisma.movementRequest.deleteMany({
    where: {
      status: { in: ['accepted', 'rejected'] },
      resolvedAt: { lt: cutoff },
    },
  });
  return result.count;
}

/** Delete map image files on disk that no GameMap row references. */
export async function sweepOrphanMapUploads(): Promise<number> {
  let removed = 0;
  let files: string[];
  try {
    files = await readdir(MAP_UPLOAD_DIR);
  } catch {
    return 0;
  }

  const maps = await prisma.gameMap.findMany({
    where: { imageUrl: { startsWith: '/uploads/maps/' } },
    select: { imageUrl: true },
  });
  const referenced = new Set(
    maps
      .map((m) => m.imageUrl)
      .filter((url): url is string => Boolean(url))
      .map((url) => path.basename(url)),
  );

  for (const file of files) {
    if (referenced.has(file)) continue;
    try {
      await unlink(path.join(MAP_UPLOAD_DIR, file));
      removed += 1;
    } catch {
      // ignore missing / locked files
    }
  }
  return removed;
}

export async function runDataRetention(): Promise<{
  diceRollsRemoved: number;
  movementRequestsRemoved: number;
  orphanUploadsRemoved: number;
}> {
  const [diceRollsRemoved, movementRequestsRemoved, orphanUploadsRemoved] = await Promise.all([
    pruneDiceRolls(),
    pruneMovementRequests(),
    sweepOrphanMapUploads(),
  ]);
  return { diceRollsRemoved, movementRequestsRemoved, orphanUploadsRemoved };
}

export function scheduleDataRetention(
  log: { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void },
): () => void {
  const run = async () => {
    try {
      const stats = await runDataRetention();
      if (
        stats.diceRollsRemoved > 0 ||
        stats.movementRequestsRemoved > 0 ||
        stats.orphanUploadsRemoved > 0
      ) {
        log.info(stats, 'data retention completed');
      }
    } catch (err) {
      log.error({ err }, 'data retention failed');
    }
  };

  void run();
  const timer = setInterval(() => void run(), config.dataRetentionIntervalMs);
  return () => clearInterval(timer);
}
