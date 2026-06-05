import type { Server } from 'socket.io';
import { isGameDm } from './game-access.js';
import { emitToGame } from './game-socket.js';
import { prisma } from './prisma.js';

export type GamePresenceUser = {
  userId: string;
  displayName: string;
  isDm: boolean;
};

type PresenceEntry = {
  displayName: string;
  isDm: boolean;
  sockets: Set<string>;
};

/** gameId → userId → open socket tabs */
const presenceByGame = new Map<string, Map<string, PresenceEntry>>();

function listPresence(gameId: string): GamePresenceUser[] {
  const gameMap = presenceByGame.get(gameId);
  if (!gameMap) return [];
  return Array.from(gameMap.entries())
    .map(([userId, entry]) => ({
      userId,
      displayName: entry.displayName,
      isDm: entry.isDm,
    }))
    .sort((a, b) => {
      if (a.isDm !== b.isDm) return a.isDm ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
}

function broadcastPresence(io: Server, gameId: string): void {
  emitToGame(io, gameId, 'game:presence', { users: listPresence(gameId) });
}

export async function addGamePresence(
  io: Server,
  gameId: string,
  userId: string,
  socketId: string,
): Promise<void> {
  const [user, game] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.game.findUniqueOrThrow({ where: { id: gameId } }),
  ]);

  let gameMap = presenceByGame.get(gameId);
  if (!gameMap) {
    gameMap = new Map();
    presenceByGame.set(gameId, gameMap);
  }

  let entry = gameMap.get(userId);
  if (!entry) {
    entry = {
      displayName: user.displayName,
      isDm: isGameDm(game, userId),
      sockets: new Set(),
    };
    gameMap.set(userId, entry);
  }
  entry.sockets.add(socketId);
  broadcastPresence(io, gameId);
}

export function removeGamePresence(
  io: Server,
  gameId: string,
  userId: string,
  socketId: string,
): void {
  const gameMap = presenceByGame.get(gameId);
  if (!gameMap) return;

  const entry = gameMap.get(userId);
  if (!entry) return;

  entry.sockets.delete(socketId);
  if (entry.sockets.size === 0) {
    gameMap.delete(userId);
  }
  if (gameMap.size === 0) {
    presenceByGame.delete(gameId);
  }
  broadcastPresence(io, gameId);
}

type PresenceSocket = {
  id: string;
  rooms: Set<string>;
  data: { userId?: string; joinedGames?: Set<string> };
};

function gameIdsForSocket(socket: PresenceSocket): string[] {
  const tracked = socket.data.joinedGames;
  if (tracked && tracked.size > 0) {
    return [...tracked];
  }
  const fromRooms: string[] = [];
  for (const room of socket.rooms) {
    if (room.startsWith('game:')) {
      fromRooms.push(room.slice('game:'.length));
    }
  }
  return fromRooms;
}

export function trackGameJoin(socket: PresenceSocket, gameId: string): void {
  if (!socket.data.joinedGames) {
    socket.data.joinedGames = new Set();
  }
  socket.data.joinedGames.add(gameId);
}

export function trackGameLeave(socket: PresenceSocket, gameId: string): void {
  socket.data.joinedGames?.delete(gameId);
}

export function removeSocketPresence(io: Server, socket: PresenceSocket): void {
  const userId = socket.data.userId;
  if (!userId) return;

  for (const gameId of gameIdsForSocket(socket)) {
    removeGamePresence(io, gameId, userId, socket.id);
  }
  socket.data.joinedGames?.clear();
}
