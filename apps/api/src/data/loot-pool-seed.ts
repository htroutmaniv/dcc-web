import type { LootPoolEntry } from '@dcc-web/shared';

export const LOOT_POOL_SEED: { name: string; description: string; entries: LootPoolEntry[] }[] = [
  {
    name: 'Humanoid small',
    description: 'Goblins, kobolds',
    entries: [
      { name: 'Copper pieces', category: 'treasure', quantity: 10, weight: 4, properties: {} },
      { name: 'Dagger', category: 'weapon', quantity: 1, weight: 2, properties: { damage: '1d4' } },
      { name: 'Shortbow', category: 'weapon', quantity: 1, weight: 1, properties: { damage: '1d6' } },
      { name: 'Nothing', category: 'misc', quantity: 0, weight: 3, properties: {} },
    ],
  },
  {
    name: 'Humanoid medium',
    description: 'Orcs, hobgoblins',
    entries: [
      { name: 'Silver pieces', category: 'treasure', quantity: 20, weight: 3, properties: {} },
      { name: 'Handaxe', category: 'weapon', quantity: 1, weight: 2, properties: { damage: '1d6' } },
      { name: 'Leather armor', category: 'armor', quantity: 1, weight: 1, properties: { acBonus: 2 } },
      { name: 'Nothing', category: 'misc', quantity: 0, weight: 2, properties: {} },
    ],
  },
  {
    name: 'Beast remains',
    description: 'Natural creatures',
    entries: [
      { name: 'Pelt (worth 5 sp)', category: 'treasure', quantity: 1, weight: 3, properties: {} },
      { name: 'Teeth/claws', category: 'misc', quantity: 1, weight: 2, properties: {} },
      { name: 'Nothing', category: 'misc', quantity: 0, weight: 5, properties: {} },
    ],
  },
];
