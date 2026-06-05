import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';
import { ITEM_CATALOG_SEED } from '../src/data/item-catalog-seed.js';
import { MONSTER_CATALOG_SEED } from '../src/data/monster-catalog-seed.js';
import { LOOT_POOL_SEED } from '../src/data/loot-pool-seed.js';
import { seedOccupations } from '../src/data/occupation-seed.js';
import { seedCharacterNames } from '../src/data/name-seed.js';
import { defaultMonsterSheet } from '@dcc-web/shared';

const prisma = new PrismaClient();

async function main() {
  const occupationCount = await seedOccupations(prisma);
  console.log(`Seeded ${occupationCount} funnel occupations`);

  const nameCount = await seedCharacterNames(prisma);
  console.log(`Seeded ${nameCount} character names`);

  for (const row of ITEM_CATALOG_SEED) {
    await prisma.itemCatalog.upsert({
      where: {
        category_name: { category: row.category, name: row.name },
      },
      create: {
        category: row.category,
        name: row.name,
        description: row.description ?? '',
        properties: row.properties,
      },
      update: {
        description: row.description ?? '',
        properties: row.properties,
      },
    });
  }
  console.log(`Seeded ${ITEM_CATALOG_SEED.length} catalog items`);

  const poolIds: Record<string, string> = {};
  for (const row of LOOT_POOL_SEED) {
    const pool = await prisma.lootPool.upsert({
      where: { name: row.name },
      create: {
        name: row.name,
        description: row.description,
        entries: row.entries,
      },
      update: { description: row.description, entries: row.entries },
    });
    poolIds[row.name] = pool.id;
  }
  console.log(`Seeded ${LOOT_POOL_SEED.length} loot pools`);

  for (const row of MONSTER_CATALOG_SEED) {
    const sheet = defaultMonsterSheet({
      name: 'Melee',
      attackBonus: row.attackBonus,
      damage: row.damage,
    });
    const lootPoolId =
      row.tags?.includes('humanoid') && row.baseLevel <= 1
        ? poolIds['Humanoid small']
        : row.tags?.includes('humanoid')
          ? poolIds['Humanoid medium']
          : row.tags?.includes('beast')
            ? poolIds['Beast remains']
            : null;

    await prisma.monsterCatalog.upsert({
      where: { name: row.name },
      create: {
        name: row.name,
        description: row.description ?? '',
        baseLevel: row.baseLevel,
        hitDice: row.hitDice,
        ac: row.ac,
        attackBonus: row.attackBonus,
        damage: row.damage,
        initMod: row.initMod ?? 0,
        speed: row.speed ?? 30,
        hpAvg: row.hpAvg ?? null,
        tags: row.tags ?? [],
        sheet,
        lootPoolId: lootPoolId ?? undefined,
      },
      update: {
        description: row.description ?? '',
        baseLevel: row.baseLevel,
        hitDice: row.hitDice,
        ac: row.ac,
        attackBonus: row.attackBonus,
        damage: row.damage,
        initMod: row.initMod ?? 0,
        speed: row.speed ?? 30,
        hpAvg: row.hpAvg ?? null,
        tags: row.tags ?? [],
        sheet,
        lootPoolId: lootPoolId ?? undefined,
      },
    });
  }
  console.log(`Seeded ${MONSTER_CATALOG_SEED.length} catalog monsters`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
