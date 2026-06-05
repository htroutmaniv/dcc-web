import type { ItemCategory, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { toMonsterInstance } from './monster-service.js';

type OwnerType = 'character' | 'monster';

export type TransferInventoryInput = {
  sourceType: OwnerType;
  sourceId: string;
  sourceItemId: string;
  targetType: OwnerType;
  targetId: string;
  quantity?: number;
};

type ItemLine = {
  id: string;
  category: ItemCategory;
  name: string;
  quantity: number;
  notes: string;
  properties: Prisma.JsonValue;
};

function mergeKey(category: string, name: string): string {
  return `${category}\0${name.trim().toLowerCase()}`;
}

function itemsStackable(a: ItemLine, b: { category: string; name: string }): boolean {
  return mergeKey(a.category, a.name) === mergeKey(b.category, b.name);
}

export async function transferInventoryItem(
  gameId: string,
  input: TransferInventoryInput,
): Promise<{
  sourceCharacter?: Awaited<ReturnType<typeof loadCharacter>>;
  targetCharacter?: Awaited<ReturnType<typeof loadCharacter>>;
  sourceMonster?: ReturnType<typeof toMonsterInstance>;
  targetMonster?: ReturnType<typeof toMonsterInstance>;
}> {
  if (input.sourceType === input.targetType && input.sourceId === input.targetId) {
    throw new Error('Source and target must be different');
  }

  return prisma.$transaction(async (tx) => {
    const source = await loadSourceItem(tx, gameId, input);
    const qty = Math.min(input.quantity ?? source.quantity, source.quantity);
    if (qty < 1) throw new Error('Nothing to transfer');

    await applySourceDeduction(tx, input.sourceType, input.sourceId, source, qty);
    await applyTargetAddition(tx, gameId, input.targetType, input.targetId, source, qty);

    const result: {
      sourceCharacter?: Awaited<ReturnType<typeof loadCharacter>>;
      targetCharacter?: Awaited<ReturnType<typeof loadCharacter>>;
      sourceMonster?: ReturnType<typeof toMonsterInstance>;
      targetMonster?: ReturnType<typeof toMonsterInstance>;
    } = {};

    if (input.sourceType === 'character') {
      result.sourceCharacter = await loadCharacter(tx, input.sourceId);
    } else {
      const row = await tx.gameMonster.findUniqueOrThrow({
        where: { id: input.sourceId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      result.sourceMonster = toMonsterInstance(row, row.items);
    }

    if (input.targetType === 'character') {
      result.targetCharacter = await loadCharacter(tx, input.targetId);
    } else {
      const row = await tx.gameMonster.findUniqueOrThrow({
        where: { id: input.targetId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      result.targetMonster = toMonsterInstance(row, row.items);
    }

    return result;
  });
}

async function loadSourceItem(
  tx: Prisma.TransactionClient,
  gameId: string,
  input: TransferInventoryInput,
): Promise<ItemLine> {
  if (input.sourceType === 'character') {
    const row = await tx.characterItem.findFirst({
      where: { id: input.sourceItemId, character: { id: input.sourceId, gameId } },
    });
    if (!row) throw new Error('Source item not found');
    return row;
  }
  const row = await tx.monsterItem.findFirst({
    where: { id: input.sourceItemId, monster: { id: input.sourceId, gameId } },
  });
  if (!row) throw new Error('Source item not found');
  return row;
}

async function applySourceDeduction(
  tx: Prisma.TransactionClient,
  sourceType: OwnerType,
  sourceId: string,
  source: ItemLine,
  qty: number,
) {
  if (source.quantity <= qty) {
    if (sourceType === 'character') {
      await tx.characterItem.delete({ where: { id: source.id, characterId: sourceId } });
      await tx.character.update({
        where: { id: sourceId },
        data: { version: { increment: 1 } },
      });
    } else {
      await tx.monsterItem.delete({ where: { id: source.id, monsterId: sourceId } });
    }
    return;
  }
  if (sourceType === 'character') {
    await tx.characterItem.update({
      where: { id: source.id, characterId: sourceId },
      data: { quantity: source.quantity - qty },
    });
    await tx.character.update({
      where: { id: sourceId },
      data: { version: { increment: 1 } },
    });
  } else {
    await tx.monsterItem.update({
      where: { id: source.id, monsterId: sourceId },
      data: { quantity: source.quantity - qty },
    });
  }
}

async function applyTargetAddition(
  tx: Prisma.TransactionClient,
  gameId: string,
  targetType: OwnerType,
  targetId: string,
  source: ItemLine,
  qty: number,
) {
  if (targetType === 'character') {
    const character = await tx.character.findFirstOrThrow({
      where: { id: targetId, gameId },
      include: { items: true },
    });
    const match = character.items.find((i) => itemsStackable(i, source));
    if (match) {
      await tx.characterItem.update({
        where: { id: match.id },
        data: { quantity: match.quantity + qty },
      });
    } else {
      const maxOrder = character.items.reduce((m, i) => Math.max(m, i.sortOrder), -1);
      await tx.characterItem.create({
        data: {
          characterId: targetId,
          category: source.category,
          name: source.name,
          quantity: qty,
          notes: source.notes,
          properties: source.properties as Prisma.InputJsonValue,
          sortOrder: maxOrder + 1,
        },
      });
    }
    await tx.character.update({
      where: { id: targetId },
      data: { version: { increment: 1 } },
    });
    return;
  }

  await tx.gameMonster.findFirstOrThrow({ where: { id: targetId, gameId } });
  const items = await tx.monsterItem.findMany({ where: { monsterId: targetId } });
  const match = items.find((i) => itemsStackable(i, source));
  if (match) {
    await tx.monsterItem.update({
      where: { id: match.id },
      data: { quantity: match.quantity + qty },
    });
  } else {
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    await tx.monsterItem.create({
      data: {
        monsterId: targetId,
        category: source.category,
        name: source.name,
        quantity: qty,
        notes: source.notes,
        properties: source.properties as Prisma.InputJsonValue,
        sortOrder: maxOrder + 1,
      },
    });
  }
}

async function loadCharacter(tx: Prisma.TransactionClient, characterId: string) {
  return tx.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}
