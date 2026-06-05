import type { PrismaClient } from '@prisma/client';
import { OCCUPATION_SEED_ROWS } from './occupation-seed-data.js';
import { parseOccupationSeedRow, validateOccupationTable } from './occupation-parse.js';

export async function seedOccupations(prisma: PrismaClient): Promise<number> {
  const parsed = OCCUPATION_SEED_ROWS.map(parseOccupationSeedRow);
  validateOccupationTable(parsed);

  let sortOrder = 0;
  for (const row of parsed) {
    await prisma.occupation.upsert({
      where: { name: row.name },
      create: {
        rollLow: row.rollLow,
        rollHigh: row.rollHigh,
        name: row.name,
        race: row.race ?? null,
        trainedWeapon: row.trainedWeapon,
        weaponDamage: row.weaponDamage,
        weaponAttackBonus: 0,
        tradeGoods: row.tradeGoods,
        sortOrder: sortOrder++,
      },
      update: {
        rollLow: row.rollLow,
        rollHigh: row.rollHigh,
        race: row.race ?? null,
        trainedWeapon: row.trainedWeapon,
        weaponDamage: row.weaponDamage,
        weaponAttackBonus: 0,
        tradeGoods: row.tradeGoods,
        sortOrder: sortOrder++,
      },
    });
  }

  return parsed.length;
}
