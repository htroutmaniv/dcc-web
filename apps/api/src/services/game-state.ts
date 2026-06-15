import type { GameInitiativeState, GamePatch, GameSettings } from '@dcc-web/shared';
import { isEmptyGamePatch } from '@dcc-web/shared';
import { prisma } from '../lib/prisma.js';
import { deleteTokensForMonster } from './map-service.js';
import type { GameMapDto } from './map-service.js';

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

type PatchParts = {
  characters?: GamePatch['characters'];
  monsters?: GamePatch['monsters'];
  map?: GameMapDto | null;
  tokens?: GamePatch['tokens'];
  initiative?: GameInitiativeState | null;
  settings?: Partial<GameSettings>;
  maps?: GamePatch['maps'];
};

/** Single builder for HTTP responses and socket publish — keeps patch shape consistent. */
export function buildGamePatch(parts: PatchParts): GamePatch {
  const patch: GamePatch = {};
  if (parts.characters) patch.characters = parts.characters;
  if (parts.monsters) patch.monsters = parts.monsters;
  if (parts.map) patch.map = parts.map;
  if (parts.tokens) patch.tokens = parts.tokens;
  if (parts.initiative !== undefined) patch.initiative = parts.initiative;
  if (parts.settings) patch.settings = parts.settings;
  if (parts.maps) patch.maps = parts.maps;
  if (isEmptyGamePatch(patch)) {
    throw new Error('buildGamePatch: patch would be empty');
  }
  return patch;
}

export function buildCharacterUpsertPatch(
  character: unknown,
  extras?: Omit<PatchParts, 'characters'>,
): GamePatch {
  return buildGamePatch({
    characters: { upserted: [character] },
    ...extras,
  });
}

export function buildMonsterUpsertPatch(
  monster: unknown,
  extras?: Omit<PatchParts, 'monsters'>,
): GamePatch {
  return buildGamePatch({
    monsters: { upserted: [monster] },
    ...extras,
  });
}

export function buildMonsterDeletedPatch(
  monsterId: string,
  extras?: Omit<PatchParts, 'monsters'>,
): GamePatch {
  return buildGamePatch({
    monsters: { deletedIds: [monsterId] },
    ...extras,
  });
}

export function buildMapSnapshotPatch(
  map: GameMapDto,
  extras?: Omit<PatchParts, 'map'>,
): GamePatch {
  return buildGamePatch({ map, ...extras });
}
