import type { GameInitiativeState } from '@dcc-web/shared';
import { prisma } from '../lib/prisma.js';
import { deleteTokensForMonster } from './map-service.js';

/** Cross-entity cleanup after a monster is removed from a game. */
export async function onMonsterDeleted(
  gameId: string,
  monsterId: string,
): Promise<{ initiative: GameInitiativeState | null }> {
  await deleteTokensForMonster(monsterId);
  await prisma.gameMonster.delete({ where: { id: monsterId, gameId } });
  const { syncMonsterGroupInitiative } = await import('./monster-service.js');
  const initiative = await syncMonsterGroupInitiative(gameId);
  return { initiative };
}
