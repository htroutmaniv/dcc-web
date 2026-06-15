import type { Game } from '@prisma/client';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { secureRandomInt } from './rng.js';

/** Only the game creator (dm_user_id) is DM — not co_dm or other player roles. */
export function isGameDm(game: { dmUserId: string }, userId: string): boolean {
  return game.dmUserId === userId;
}

export type GameMemberAccess = {
  ok: true;
  game: Game;
  isDm: boolean;
};

export type GameAccessDenied = {
  ok: false;
  status: number;
  message: string;
};

export type GameAccessResult = GameMemberAccess | GameAccessDenied;

export type ResolvedGameAccess = {
  gameId: string;
  userId: string;
  game: Game;
  isDm: boolean;
};

type MembershipCacheEntry = {
  expiresAt: number;
  access: GameMemberAccess;
};

const membershipCache = new Map<string, MembershipCacheEntry>();

function membershipCacheKey(userId: string, gameId: string): string {
  return `${userId}:${gameId}`;
}

export function clearGameMembershipCache(gameId?: string): void {
  if (!gameId) {
    membershipCache.clear();
    return;
  }
  for (const key of membershipCache.keys()) {
    if (key.endsWith(`:${gameId}`)) membershipCache.delete(key);
  }
}

export async function assertGameMember(userId: string, gameId: string): Promise<GameAccessResult> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false, status: 404, message: 'Game not found' };
  if (isGameDm(game, userId)) {
    return { ok: true, game, isDm: true };
  }
  const member = await prisma.gamePlayer.findUnique({
    where: { gameId_userId: { gameId, userId } },
  });
  if (!member) {
    return { ok: false, status: 403, message: 'Not a member of this game' };
  }
  return { ok: true, game, isDm: false };
}

/** Cached membership lookup for hot paths (routes, sockets). */
export async function resolveGameMemberAccess(
  userId: string,
  gameId: string,
): Promise<GameAccessResult> {
  const ttlMs = config.gameMembershipCacheTtlMs;
  if (ttlMs > 0) {
    const key = membershipCacheKey(userId, gameId);
    const cached = membershipCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.access;
    }
    const access = await assertGameMember(userId, gameId);
    if (access.ok) {
      membershipCache.set(key, { expiresAt: Date.now() + ttlMs, access });
    }
    return access;
  }
  return assertGameMember(userId, gameId);
}

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += INVITE_CHARS[secureRandomInt(0, INVITE_CHARS.length - 1)]!;
  }
  return code;
}

const MAX_INVITE_ATTEMPTS = 12;

/** Cryptographically random invite code, retried on the unlikely DB collision. */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
    const inviteCode = generateInviteCode();
    const existing = await prisma.game.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    if (!existing) return inviteCode;
  }
  throw new Error('Failed to generate a unique invite code');
}
