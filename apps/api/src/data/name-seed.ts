import type { CharacterNameKind, PrismaClient } from '@prisma/client';
import { FIRST_NAME_SEED_ROWS, LAST_NAME_SEED_ROWS } from './name-seed-data.js';

async function seedKind(
  prisma: PrismaClient,
  kind: CharacterNameKind,
  names: readonly string[],
): Promise<number> {
  let sortOrder = 0;
  for (const name of names) {
    await prisma.characterName.upsert({
      where: { kind_name: { kind, name } },
      create: { kind, name, sortOrder: sortOrder++ },
      update: { sortOrder: sortOrder++ },
    });
  }
  return names.length;
}

export async function seedCharacterNames(prisma: PrismaClient): Promise<number> {
  const firstCount = await seedKind(prisma, 'first', FIRST_NAME_SEED_ROWS);
  const lastCount = await seedKind(prisma, 'last', LAST_NAME_SEED_ROWS);
  return firstCount + lastCount;
}
