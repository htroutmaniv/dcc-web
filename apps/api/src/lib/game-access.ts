import { secureRandomInt } from './rng.js';
import { prisma } from './prisma.js';

/** Only the game creator (dm_user_id) is DM — not co_dm or other player roles. */
export function isGameDm(game: { dmUserId: string }, userId: string): boolean {
  return game.dmUserId === userId;
}

export async function assertGameMember(userId: string, gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false as const, status: 404, message: 'Game not found' };
  if (isGameDm(game, userId)) {
    return { ok: true as const, game, isDm: true };
  }
  const member = await prisma.gamePlayer.findUnique({
    where: { gameId_userId: { gameId, userId } },
  });
  if (!member) {
    return { ok: false as const, status: 403, message: 'Not a member of this game' };
  }
  return { ok: true as const, game, isDm: false };
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
