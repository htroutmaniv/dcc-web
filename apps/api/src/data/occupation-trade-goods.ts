type OccupationItem = {
  category: 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable';
  name: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
};

/** Trade goods that start as equipped armor (from funnel occupation table). */
const ARMOR_TRADE_GOODS: Record<
  string,
  { name: string; properties: Record<string, unknown> }
> = {
  'hide armor': {
    name: 'Hide armor',
    properties: { acBonus: 2, speedPenalty: 0, checkPenalty: -1, fumbleDie: 'd8' },
  },
  'leather armor': {
    name: 'Leather armor',
    properties: { acBonus: 2, speedPenalty: 0, checkPenalty: 0, fumbleDie: 'd8' },
  },
  shield: {
    name: 'Shield',
    properties: { slot: 'shield', acBonus: 1, speedPenalty: 0, checkPenalty: 0 },
  },
  'iron helmet': {
    name: 'Iron helmet',
    properties: { acBonus: 1, speedPenalty: 0, checkPenalty: 0, fumbleDie: 'd8' },
  },
  'steel helmet': {
    name: 'Steel helmet',
    properties: { acBonus: 1, speedPenalty: 0, checkPenalty: 0, fumbleDie: 'd8' },
  },
};

export function tradeGoodToItem(
  raw: string,
  consumableLookup: (name: string) => OccupationItem | null,
): OccupationItem {
  const name = raw.trim();
  const armor = ARMOR_TRADE_GOODS[name.toLowerCase()];
  if (armor) {
    return {
      category: 'armor',
      name: armor.name,
      quantity: 1,
      properties: armor.properties,
    };
  }

  const consumable = consumableLookup(name);
  if (consumable) return consumable;

  return {
    category: 'misc',
    name,
    quantity: 1,
  };
}
