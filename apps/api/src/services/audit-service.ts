import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const AUDIT_KINDS = {
  characterStatus: 'character.status_change',
  characterOwner: 'character.owner_change',
  monsterKilled: 'monster.killed',
  monsterInPlay: 'monster.in_play_toggle',
  inventoryTransfer: 'inventory.transfer',
  gameSettings: 'game.settings_change',
  mapClear: 'map.clear',
  mapTokensReset: 'map.tokens_reset',
} as const;

export type AuditKind = (typeof AUDIT_KINDS)[keyof typeof AUDIT_KINDS];

export async function recordAudit(params: {
  gameId: string;
  actorUserId?: string | null;
  kind: AuditKind | string;
  targetType: string;
  targetId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      gameId: params.gameId,
      actorUserId: params.actorUserId ?? null,
      kind: params.kind,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listAuditLog(gameId: string, limit: number) {
  return prisma.auditLog.findMany({
    where: { gameId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      gameId: true,
      actorUserId: true,
      kind: true,
      targetType: true,
      targetId: true,
      payload: true,
      createdAt: true,
      actor: {
        select: { id: true, displayName: true },
      },
    },
  });
}
