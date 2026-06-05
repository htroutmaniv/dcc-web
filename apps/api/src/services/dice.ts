import {
  attackRollHits,
  formatAttackOutcomeLabel,
  formatRollTargetTag,
  getTargetAc,
  inferRollKind,
  type DiceRollKind,
  type RollTargetType,
} from '@dcc-web/shared';
import { rollDice } from '@dcc-web/shared';
import type { Prisma } from '@prisma/client';
import { secureRandomInt } from '../lib/rng.js';
import { prisma } from '../lib/prisma.js';

async function resolveRollTarget(
  gameId: string,
  targetType: RollTargetType,
  targetId: string,
): Promise<{ name: string; ac: number }> {
  if (targetType === 'monster') {
    const m = await prisma.gameMonster.findFirstOrThrow({
      where: { id: targetId, gameId },
      select: { name: true, ac: true, combat: true },
    });
    return { name: m.name, ac: getTargetAc(m.combat as { ac?: number } | null) ?? m.ac };
  }
  if (targetType === 'character') {
    const c = await prisma.character.findFirstOrThrow({
      where: { id: targetId, gameId },
      select: { name: true, combat: true },
    });
    return { name: c.name, ac: getTargetAc(c.combat as { ac?: number } | null) };
  }
  const t = await prisma.mapToken.findFirstOrThrow({
    where: { id: targetId, map: { gameId } },
    select: { label: true },
  });
  return { name: t.label, ac: 10 };
}

function appendTargetToReason(
  base: string,
  target: { name: string; ac: number },
  tag: string,
  outcome?: 'hit' | 'miss',
): string {
  const vs = `vs ${target.name} (AC ${target.ac})`;
  if (outcome) {
    return `${base} ${vs} — ${formatAttackOutcomeLabel(outcome)} ${tag}`.trim();
  }
  return `${base} ${vs} ${tag}`.trim();
}

export async function rollAndPersist(params: {
  gameId: string;
  userId: string;
  characterId?: string;
  notation: string;
  reason?: string;
  rollKind?: DiceRollKind;
  targetType?: RollTargetType;
  targetId?: string;
}) {
  const result = rollDice(params.notation, secureRandomInt);
  let rollKind = inferRollKind(params.reason, params.rollKind);
  let reason = params.reason ?? undefined;

  if (params.targetType && params.targetId) {
    const target = await resolveRollTarget(params.gameId, params.targetType, params.targetId);
    const tag = formatRollTargetTag(params.targetType, params.targetId);
    const base = (reason ?? result.notation).replace(/\[\[target:[^\]]+\]\]/g, '').trim();

    if (rollKind === 'attack' || params.notation.includes('d20')) {
      rollKind = 'attack';
      const natural = result.rolls[0];
      const hit = attackRollHits(result.total, target.ac, natural);
      reason = appendTargetToReason(base, target, tag, hit ? 'hit' : 'miss');
    } else if (rollKind === 'damage') {
      reason = appendTargetToReason(base, target, tag);
    } else {
      reason = appendTargetToReason(base, target, tag);
    }
  }

  const row = await prisma.diceRoll.create({
    data: {
      gameId: params.gameId,
      userId: params.userId,
      characterId: params.characterId,
      notation: result.notation,
      rolls: result.rolls,
      modifier: result.modifier,
      total: result.total,
      reason,
      rollKind,
    },
    include: {
      user: { select: { id: true, displayName: true } },
      character: { select: { id: true, name: true } },
    },
  });
  return formatDiceRollRow(row);
}

export function formatDiceRollRow(row: {
  id: string;
  gameId: string;
  userId: string;
  characterId: string | null;
  notation: string;
  rolls: unknown;
  modifier: number;
  total: number;
  reason: string | null;
  rollKind: string;
  createdAt: Date;
  user?: { id: string; displayName: string };
  character?: { id: string; name: string } | null;
}) {
  return {
    id: row.id,
    gameId: row.gameId,
    notation: row.notation,
    rolls: row.rolls as number[],
    modifier: row.modifier,
    total: row.total,
    reason: row.reason ?? undefined,
    rollKind: row.rollKind,
    characterId: row.characterId ?? undefined,
    actorUserId: row.userId,
    actorName: row.user?.displayName,
    characterName: row.character?.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listGameDiceRolls(gameId: string, limit: number) {
  const rows = await prisma.diceRoll.findMany({
    where: { gameId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: {
      user: { select: { id: true, displayName: true } },
      character: { select: { id: true, name: true } },
    },
  });
  return rows.map(formatDiceRollRow);
}

export async function applyDamageToTarget(params: {
  gameId: string;
  targetType: 'character' | 'monster' | 'npc';
  targetId: string;
  amount: number;
}): Promise<{ hpBefore: number; hpAfter: number; targetName: string }> {
  const { gameId, targetType, targetId, amount } = params;

  if (targetType === 'monster') {
    const m = await prisma.gameMonster.findFirstOrThrow({
      where: { id: targetId, gameId },
    });
    const hpBefore = m.hpCurrent;
    const hpAfter = Math.max(0, hpBefore - amount);
    await prisma.gameMonster.update({
      where: { id: targetId },
      data: { hpCurrent: hpAfter },
    });
    return { hpBefore, hpAfter, targetName: m.name };
  }

  if (targetType === 'character') {
    const c = await prisma.character.findFirstOrThrow({
      where: { id: targetId, gameId },
    });
    const combat = (c.combat ?? {}) as Record<string, unknown>;
    const hpBefore =
      typeof combat.hpCurrent === 'number' ? combat.hpCurrent : (combat.hpMax as number) ?? 0;
    const hpAfter = Math.max(0, hpBefore - amount);
    const hpMax = typeof combat.hpMax === 'number' ? combat.hpMax : hpBefore;
    await prisma.character.update({
      where: { id: targetId },
      data: {
        combat: {
          ...combat,
          hpMax,
          hpCurrent: hpAfter,
        } as Prisma.InputJsonValue,
      },
    });
    return { hpBefore, hpAfter, targetName: c.name };
  }

  const token = await prisma.mapToken.findFirstOrThrow({
    where: { id: targetId },
    include: { map: true },
  });
  if (token.map.gameId !== gameId) {
    throw new Error('Token not in this game');
  }
  if (token.kind !== 'npc') {
    throw new Error('Target is not an NPC token');
  }
  const hpBefore = token.hpCurrent ?? token.hpMax ?? 0;
  const hpMax = token.hpMax ?? hpBefore;
  const hpAfter = Math.max(0, hpBefore - amount);
  await prisma.mapToken.update({
    where: { id: targetId },
    data: {
      hpMax: hpMax || hpAfter,
      hpCurrent: hpAfter,
    },
  });
  return { hpBefore, hpAfter, targetName: token.label };
}
