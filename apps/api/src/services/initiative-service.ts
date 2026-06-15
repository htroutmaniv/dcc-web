import {
  ACTIVE_IN_PLAY_KEY,
  advanceInitiativeTurn,
  createCharacterInitiativeSkipFn,
  isActiveInPlay,
  isCharacterInInitiative,
  isCharacterTurn,
  normalizeInitiativeTurnIndex,
  rollDice,
  sortInitiativeEntries,
  type GameInitiativeState,
  type InitiativeEntry,
} from '@dcc-web/shared';
import { secureRandomInt } from '../lib/rng.js';
import { prisma } from '../lib/prisma.js';
import {
  loadInitiativeState,
  readInitiativeFromGame,
  saveInitiative,
} from './game-settings-service.js';
import { buildMonsterInitiativeEntriesForStart } from './monster-service.js';
import { tickDyingCharactersForNewRound } from './character-combat.js';

async function loadInitiativeCharacterSnapshots(gameId: string) {
  return prisma.character.findMany({
    where: { gameId },
    select: { id: true, level: true, status: true, combat: true },
  });
}

async function buildCharacterSkipFn(gameId: string) {
  const characters = await loadInitiativeCharacterSnapshots(gameId);
  return createCharacterInitiativeSkipFn(
    characters.map((c) => ({
      id: c.id,
      level: c.level,
      status: c.status,
      combat: c.combat as { hpCurrent?: number; custom?: Record<string, unknown> } | null,
    })),
  );
}

async function finalizeInitiativeTurn(
  gameId: string,
  state: GameInitiativeState,
): Promise<GameInitiativeState> {
  const shouldSkip = await buildCharacterSkipFn(gameId);
  const normalized = normalizeInitiativeTurnIndex(state, shouldSkip);
  if (
    normalized.turnIndex !== state.turnIndex ||
    normalized.round !== state.round
  ) {
    await saveInitiative(gameId, normalized);
    return normalized;
  }
  return state;
}

/** Skip past a killed PC when initiative would land on them (keeps them in the order list). */
export async function reconcileInitiativeAfterCharacterDeath(
  gameId: string,
): Promise<GameInitiativeState | null> {
  const state = await loadInitiativeState(gameId);
  if (!state?.active) return null;
  return finalizeInitiativeTurn(gameId, state);
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

  const monsterEntries = await buildMonsterInitiativeEntriesForStart(gameId);
  const order = sortInitiativeEntries([...entries, ...monsterEntries]);
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
): Promise<{ initiative: GameInitiativeState | null; mortalityUpdates: string[] }> {
  const state = await loadInitiativeState(gameId);
  if (!state?.active) return { initiative: null, mortalityUpdates: [] };

  const shouldSkip = await buildCharacterSkipFn(gameId);
  const next = advanceInitiativeTurn(state, shouldSkip);
  let mortalityUpdates: string[] = [];
  if (next.round > state.round) {
    mortalityUpdates = await tickDyingCharactersForNewRound(gameId);
  }
  await saveInitiative(gameId, next);
  const initiative = await finalizeInitiativeTurn(gameId, next);
  return { initiative, mortalityUpdates };
}

export async function endGameInitiative(gameId: string): Promise<void> {
  await saveInitiative(gameId, null);
}

/** Adds a late joiner to an active initiative order using their rolled result. */
export async function addCharacterToInitiativeFromRoll(params: {
  gameId: string;
  characterId: string;
  initiative: number;
  d20Roll: number;
  modifier: number;
}): Promise<GameInitiativeState | null> {
  const state = await loadInitiativeState(params.gameId);
  if (!state?.active) return null;
  if (isCharacterInInitiative(state, params.characterId)) return null;

  const character = await prisma.character.findFirst({
    where: { id: params.characterId, gameId: params.gameId },
    select: { id: true, name: true, status: true },
  });
  if (!character || character.status !== 'alive') return null;

  const entry: InitiativeEntry = {
    entryId: character.id,
    kind: 'character',
    characterId: character.id,
    name: character.name,
    initiative: params.initiative,
    d20Roll: params.d20Roll,
    modifier: params.modifier,
  };
  const order = sortInitiativeEntries([...state.order, entry]);
  const next: GameInitiativeState = { ...state, order };
  await saveInitiative(params.gameId, next);
  return next;
}

export async function endCharacterTurn(params: {
  gameId: string;
  userId: string;
  isDm: boolean;
  characterId?: string;
}): Promise<{ initiative: GameInitiativeState | null; mortalityUpdates: string[] }> {
  const state = await loadInitiativeState(params.gameId);
  if (!state?.active) return { initiative: null, mortalityUpdates: [] };

  const shouldSkip = await buildCharacterSkipFn(params.gameId);

  if (!params.isDm) {
    if (!params.characterId) {
      throw new Error('characterId required');
    }
    if (!isCharacterTurn(state, params.characterId, shouldSkip)) {
      throw new Error('Not this character\'s turn');
    }
    const character = await prisma.character.findUnique({
      where: { id: params.characterId },
    });
    if (!character || character.ownerUserId !== params.userId) {
      throw new Error('Not your character');
    }
  }

  const next = advanceInitiativeTurn(state, shouldSkip);
  let mortalityUpdates: string[] = [];
  if (next.round > state.round) {
    mortalityUpdates = await tickDyingCharactersForNewRound(params.gameId);
  }
  await saveInitiative(params.gameId, next);
  const initiative = await finalizeInitiativeTurn(params.gameId, next);
  return { initiative, mortalityUpdates };
}

export async function getInitiativeForGame(gameId: string): Promise<GameInitiativeState | null> {
  return loadInitiativeState(gameId);
}

export { ACTIVE_IN_PLAY_KEY, readInitiativeFromGame, saveInitiative };
