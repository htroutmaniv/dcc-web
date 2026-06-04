import { prisma } from './prisma.js';

export async function assertGameMember(userId: string, gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false as const, status: 404, message: 'Game not found' };
  if (game.dmUserId === userId) return { ok: true as const, game, isDm: true };
  const member = await prisma.gamePlayer.findUnique({
    where: { gameId_userId: { gameId, userId } },
  });
  if (!member) return { ok: false as const, status: 403, message: 'Not a member of this game' };
  return { ok: true as const, game, isDm: false };
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
