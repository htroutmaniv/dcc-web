import {
  ACTIVE_IN_PLAY_KEY,
  advanceInitiativeTurn,
  isActiveInPlay,
  isCharacterTurn,
  parseGameInitiative,
  parseGameSettings,
  rollDice,
  sortInitiativeEntries,
  type GameInitiativeState,
  type InitiativeEntry,
} from '@dcc-web/shared';
import { secureRandomInt } from '../lib/rng.js';
import { prisma } from '../lib/prisma.js';
import { buildMonsterGroupInitiativeEntry } from './monster-service.js';

function mergeSettings(
  current: unknown,
  initiative: GameInitiativeState | null,
): Record<string, unknown> {
  const base = parseGameSettings(current);
  return {
    ...base,
    initiative: initiative?.active ? initiative : null,
  };
}

async function saveInitiative(gameId: string, initiative: GameInitiativeState | null) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  const settings = mergeSettings(game.settings, initiative);
  await prisma.game.update({
    where: { id: gameId },
    data: { settings: settings as object },
  });
  return settings;
}

function rollInitiativeForMod(mod: number) {
  const notation = `1d20${mod >= 0 ? `+${mod}` : mod}`;
  const result = rollDice(notation, secureRandomInt);
  return {
    initiative: result.total,
    d20Roll: result.rolls[0] ?? 0,
    modifier: mod,
  };
}

export async function startGameInitiative(gameId: string): Promise<GameInitiativeState> {
  const characters = await prisma.character.findMany({
    where: { gameId, status: 'alive' },
    select: { id: true, name: true, stats: true, status: true },
  });

  const entries: InitiativeEntry[] = [];
  for (const c of characters) {
    const stats = c.stats as { initiative?: number; custom?: Record<string, unknown> };
    if (
      !isActiveInPlay({
        status: c.status,
        stats: { custom: stats.custom },
      })
    ) {
      continue;
    }
    const mod = stats.initiative ?? 0;
    const rolled = rollInitiativeForMod(mod);
    entries.push({
      entryId: c.id,
      kind: 'character',
      characterId: c.id,
      name: c.name,
      initiative: rolled.initiative,
      d20Roll: rolled.d20Roll,
      modifier: rolled.modifier,
    });
  }

  const monsterGroup = await buildMonsterGroupInitiativeEntry(gameId);
  const order = sortInitiativeEntries([
    ...entries,
    ...(monsterGroup ? [monsterGroup] : []),
  ]);
  const state: GameInitiativeState = {
    active: order.length > 0,
    round: 1,
    turnIndex: 0,
    order,
  };

  await saveInitiative(gameId, state.active ? state : null);
  return state;
}

export async function advanceGameInitiative(
  gameId: string,
): Promise<GameInitiativeState | null> {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  const state = parseGameInitiative(game.settings);
  if (!state?.active) return null;

  const next = advanceInitiativeTurn(state);
  await saveInitiative(gameId, next);
  return next;
}

export async function endGameInitiative(gameId: string): Promise<void> {
  await saveInitiative(gameId, null);
}

export async function endCharacterTurn(params: {
  gameId: string;
  userId: string;
  isDm: boolean;
  characterId?: string;
}): Promise<GameInitiativeState | null> {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: params.gameId } });
  const state = parseGameInitiative(game.settings);
  if (!state?.active) return null;

  if (!params.isDm) {
    if (!params.characterId) {
      throw new Error('characterId required');
    }
    if (!isCharacterTurn(state, params.characterId)) {
      throw new Error('Not this character\'s turn');
    }
    const character = await prisma.character.findUnique({
      where: { id: params.characterId },
    });
    if (!character || character.ownerUserId !== params.userId) {
      throw new Error('Not your character');
    }
  }

  const next = advanceInitiativeTurn(state);
  await saveInitiative(params.gameId, next);
  return next;
}

export function getInitiativeFromGame(settings: unknown): GameInitiativeState | null {
  return parseGameInitiative(settings);
}

export { ACTIVE_IN_PLAY_KEY };
