import type { Prisma } from '@prisma/client';
import {
  clampCharacterHpUpper,
  resolveCharacterCombatAfterHpChange,
  tickMortalRound,
} from '@dcc-web/shared';
import { prisma } from '../lib/prisma.js';
import { applyCharacterStatus } from './character-status.js';

type CharacterRow = {
  id: string;
  level: number;
  status: string;
  combat: unknown;
};

export function mergeCharacterCombatWithMortality(
  character: CharacterRow,
  patchCombat: Record<string, unknown>,
): { combat: Record<string, unknown>; markDead: boolean } {
  const existing = (character.combat ?? {}) as Record<string, unknown>;
  const merged = { ...existing, ...patchCombat };
  const hpBefore =
    typeof existing.hpCurrent === 'number'
      ? existing.hpCurrent
      : typeof existing.hpMax === 'number'
        ? existing.hpMax
        : 0;
  const hpMax =
    typeof merged.hpMax === 'number'
      ? merged.hpMax
      : typeof existing.hpMax === 'number'
        ? existing.hpMax
        : undefined;
  const rawHp =
    typeof merged.hpCurrent === 'number' ? merged.hpCurrent : hpBefore;
  const hpAfter = clampCharacterHpUpper(rawHp, hpMax);

  return resolveCharacterCombatAfterHpChange({
    level: character.level,
    status: character.status,
    hpBefore,
    hpAfter,
    combat: { ...merged, hpMax, hpCurrent: hpAfter },
  });
}

export async function tickDyingCharactersForNewRound(gameId: string): Promise<string[]> {
  const rows = await prisma.character.findMany({
    where: { gameId, status: 'alive' },
    select: { id: true, level: true, combat: true },
  });

  const deadIds: string[] = [];

  for (const row of rows) {
    const combat = (row.combat ?? {}) as Record<string, unknown>;
    const hpCurrent = typeof combat.hpCurrent === 'number' ? combat.hpCurrent : 0;
    if (hpCurrent > 0) continue;

    const { combat: nextCombat, markDead } = tickMortalRound(combat, row.level);
    if (nextCombat !== combat) {
      await prisma.character.update({
        where: { id: row.id },
        data: { combat: nextCombat as Prisma.InputJsonValue },
      });
    }
    if (markDead) {
      await prisma.$transaction(async (tx) => {
        await applyCharacterStatus(tx, row.id, 'dead');
      });
      deadIds.push(row.id);
    }
  }

  return deadIds;
}
