import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';
import { ITEM_CATALOG_SEED } from '../src/data/item-catalog-seed.js';

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
