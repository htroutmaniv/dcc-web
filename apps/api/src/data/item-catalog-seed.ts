import type { Prisma } from '@prisma/client';

type SeedRow = {
  category: 'weapon' | 'armor' | 'misc' | 'disposable';
  name: string;
  description?: string;
  properties: Record<string, unknown>;
};

export const ITEM_CATALOG_SEED: SeedRow[] = [
  // Weapons
  { category: 'weapon', name: 'Dagger', properties: { damage: '1d4', attackBonus: 0 } },
  { category: 'weapon', name: 'Staff', properties: { damage: '1d4+1', attackBonus: 0 } },
  { category: 'weapon', name: 'Short sword', properties: { damage: '1d6', attackBonus: 0 } },
  { category: 'weapon', name: 'Longsword', properties: { damage: '1d8', attackBonus: 0 } },
  { category: 'weapon', name: 'Handaxe', properties: { damage: '1d6', attackBonus: 0 } },
  { category: 'weapon', name: 'Battleaxe', properties: { damage: '1d8', attackBonus: 0 } },
  { category: 'weapon', name: 'Mace', properties: { damage: '1d6', attackBonus: 0 } },
  { category: 'weapon', name: 'Spear', properties: { damage: '1d8', attackBonus: 0 } },
  { category: 'weapon', name: 'Shortbow', properties: { damage: '1d6', attackBonus: 0 } },
  { category: 'weapon', name: 'Longbow', properties: { damage: '1d8', attackBonus: 0 } },
  { category: 'weapon', name: 'Crossbow', properties: { damage: '1d6', attackBonus: 0 } },
  { category: 'weapon', name: 'Sling', properties: { damage: '1d4', attackBonus: 0 } },
  { category: 'weapon', name: 'Club', properties: { damage: '1d4', attackBonus: 0 } },
  { category: 'weapon', name: 'Cleaver', properties: { damage: '1d6', attackBonus: 0 } },
  { category: 'weapon', name: 'Unarmed', properties: { damage: '1d3', attackBonus: 0 } },
  // Armor
  {
    category: 'armor',
    name: 'Leather armor',
    description: 'Light armor',
    properties: { acBonus: 2, speedPenalty: 0, checkPenalty: 0, fumbleDie: 'd8' },
  },
  {
    category: 'armor',
    name: 'Studded leather',
    properties: { acBonus: 3, speedPenalty: 0, checkPenalty: -1, fumbleDie: 'd12' },
  },
  {
    category: 'armor',
    name: 'Chain mail',
    properties: { acBonus: 4, speedPenalty: -5, checkPenalty: -2, fumbleDie: 'd16' },
  },
  {
    category: 'armor',
    name: 'Scale mail',
    properties: { acBonus: 4, speedPenalty: -3, checkPenalty: -3, fumbleDie: 'd20' },
  },
  {
    category: 'armor',
    name: 'Banded mail',
    properties: { acBonus: 5, speedPenalty: -5, checkPenalty: -3, fumbleDie: 'd20' },
  },
  {
    category: 'armor',
    name: 'Plate mail',
    properties: { acBonus: 6, speedPenalty: -5, checkPenalty: -4, fumbleDie: 'd24' },
  },
  {
    category: 'armor',
    name: 'Full plate',
    properties: {
      acBonus: 8,
      speedPenalty: -10,
      checkPenalty: -6,
      fumbleDie: 'd30',
      spellCheckPenalty: -2,
    },
  },
  {
    category: 'armor',
    name: 'Shield (wood)',
    properties: { slot: 'shield', acBonus: 1, speedPenalty: 0, checkPenalty: 0 },
  },
  {
    category: 'armor',
    name: 'Shield (steel)',
    properties: { slot: 'shield', acBonus: 2, speedPenalty: 0, checkPenalty: -1 },
  },
  // Consumables
  {
    category: 'disposable',
    name: 'Torch',
    properties: { light: true, consumedWhenEmpty: true },
  },
  {
    category: 'disposable',
    name: 'Lantern',
    properties: { light: true, requiresFuel: true },
  },
  { category: 'disposable', name: 'Oil flask', properties: { fuel: true, uses: 2 } },
  { category: 'disposable', name: 'Rations (1 day)', properties: { food: true } },
  {
    category: 'disposable',
    name: 'Waterskin',
    properties: {
      vessel: true,
      capacity: 3,
      usesRemaining: 3,
      unitLabel: 'day',
    },
  },
  {
    category: 'disposable',
    name: 'Holy water',
    properties: { vessel: true, capacity: 1, usesRemaining: 1, unitLabel: 'use' },
  },
  { category: 'disposable', name: 'Bandages', properties: {} },
  { category: 'disposable', name: 'Antitoxin', properties: { poisonous: true } },
  { category: 'disposable', name: 'Alchemist fire', properties: { poisonous: true } },
  // Misc
  { category: 'misc', name: 'Rope (50 ft)', properties: {} },
  { category: 'misc', name: 'Iron spike', properties: {} },
  { category: 'misc', name: 'Grappling hook', properties: {} },
  { category: 'misc', name: 'Lantern', properties: {} },
  { category: 'misc', name: 'Thieves\' tools', properties: {} },
  { category: 'misc', name: 'Holy symbol', properties: {} },
  { category: 'misc', name: 'Spellbook', properties: {} },
  { category: 'misc', name: 'Backpack', properties: {} },
];

export function seedRowsToPrisma(): Prisma.ItemCatalogCreateManyInput[] {
  return ITEM_CATALOG_SEED.map((row) => ({
    category: row.category,
    name: row.name,
    description: row.description ?? '',
    properties: row.properties as Prisma.InputJsonValue,
  }));
}
