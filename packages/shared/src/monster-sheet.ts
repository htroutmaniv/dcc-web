/** Full monster sheet (catalog template + game instance). */

export interface MonsterAttack {
  id: string;
  name: string;
  attackBonus: number;
  damage: string;
  range?: string;
  notes?: string;
}

export interface MonsterSpecialAbility {
  name: string;
  description: string;
}

export interface MonsterSheetData {
  attacks: MonsterAttack[];
  specialAbilities: MonsterSpecialAbility[];
}

export interface MonsterStatsJson {
  speed?: number;
  initiative?: number;
  saves?: Record<string, number>;
  abilities?: Record<string, { score: number; modifier: number }>;
  custom?: Record<string, unknown>;
}

export interface MonsterCombatJson {
  ac?: number;
  hpMax?: number;
  hpCurrent?: number;
}

export interface LootPoolEntry {
  name: string;
  category: 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable';
  quantity?: number;
  weight: number;
  notes?: string;
  properties?: Record<string, unknown>;
}

export interface LootPoolDefinition {
  id: string;
  name: string;
  description: string;
  entries: LootPoolEntry[];
}

export interface MonsterItemRow {
  id: string;
  category: string;
  name: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
}

export function defaultMonsterSheet(primary?: {
  name?: string;
  attackBonus?: number;
  damage?: string;
}): MonsterSheetData {
  const atkName = primary?.name ?? 'Melee';
  return {
    attacks: [
      {
        id: 'primary',
        name: atkName,
        attackBonus: primary?.attackBonus ?? 0,
        damage: primary?.damage ?? '1d6',
      },
    ],
    specialAbilities: [],
  };
}

export function parseMonsterSheet(raw: unknown): MonsterSheetData {
  if (!raw || typeof raw !== 'object') return defaultMonsterSheet();
  const o = raw as Partial<MonsterSheetData>;
  const attacks = Array.isArray(o.attacks)
    ? o.attacks.filter(
        (a): a is MonsterAttack =>
          a != null &&
          typeof a === 'object' &&
          typeof (a as MonsterAttack).name === 'string',
      )
    : [];
  const specialAbilities = Array.isArray(o.specialAbilities)
    ? o.specialAbilities.filter(
        (s): s is MonsterSpecialAbility =>
          s != null && typeof s === 'object' && typeof (s as MonsterSpecialAbility).name === 'string',
      )
    : [];
  return {
    attacks: attacks.length ? attacks : defaultMonsterSheet().attacks,
    specialAbilities,
  };
}
