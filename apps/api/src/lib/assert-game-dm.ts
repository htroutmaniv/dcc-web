import { assertGameMember, isGameDm } from './game-access.js';

export async function assertGameDm(userId: string, gameId: string) {
  const access = await assertGameMember(userId, gameId);
  if (!access.ok) return access;
  if (!isGameDm(access.game, userId)) {
    return { ok: false as const, status: 403, message: 'Dungeon Master only' };
  }
  return access;
}
