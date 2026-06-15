import { rollDice } from '../dice/dice-notation.js';
import type { MonsterCombatJson, MonsterSheetData, MonsterStatsJson } from './monster-sheet.js';

export type { MonsterSheetData, MonsterStatsJson, MonsterCombatJson, MonsterItemRow } from './monster-sheet.js';
export {
  defaultMonsterSheet,
  parseMonsterSheet,
  type LootPoolDefinition,
  type LootPoolEntry,
} from './monster-sheet.js';

/** Monster stat block (catalog base or scaled instance). */

export interface MonsterStatBlock {  hitDice: string;
  ac: number;
  attackBonus: number;
  damage: string;
  initMod: number;
  speed: number;
  hpMax: number;
}

export interface MonsterCatalogEntry {
  id: string;
  name: string;
  description: string;
  baseLevel: number;
  hitDice: string;
  ac: number;
  attackBonus: number;
  damage: string;
  initMod: number;
  speed: number;
  hpAvg?: number | null;
  tags: string[];
  sheet?: MonsterSheetData;
  stats?: MonsterStatsJson;
  combat?: MonsterCombatJson;
  lootPoolId?: string | null;
}

export interface GameMonsterInstance extends MonsterStatBlock {
  id: string;
  gameId: string;
  catalogId?: string | null;
  name: string;
  scaleLevel: number;
  hpCurrent: number;
  notes: string;
  sortOrder: number;
  sheet?: MonsterSheetData;
  stats?: MonsterStatsJson;
  combat?: MonsterCombatJson;
  items?: import('./monster-sheet.js').MonsterItemRow[];
}

const HIT_DICE_RE = /^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/i;

/** Average HP from hit dice notation (e.g. 2d8+2). */
export function averageFromHitDice(hitDice: string, hpAvg?: number | null): number {
  if (hpAvg != null && hpAvg > 0) return hpAvg;
  const m = hitDice.trim().match(HIT_DICE_RE);
  if (!m) return 8;
  const count = Number(m[1]);
  const sides = Number(m[2]);
  const bonus = m[3] ? Number(m[3]) : 0;
  return Math.max(1, Math.round(count * ((sides + 1) / 2) + bonus));
}

function scaleDamage(damage: string, delta: number): string {
  if (delta <= 0) return damage;
  const steps = Math.floor(delta / 2);
  if (steps <= 0) return damage;
  const m = damage.match(/^(\d+)d(\d+)(.*)$/i);
  if (!m) return damage;
  const count = Number(m[1]) + steps;
  return `${count}d${m[2]}${m[3] ?? ''}`;
}

/** Scale catalog stats for a target party / encounter level. */
export function scaleMonsterStats(
  base: Omit<MonsterStatBlock, 'hpMax'> & { hpAvg?: number | null },
  baseLevel: number,
  targetLevel: number,
): MonsterStatBlock {
  const delta = targetLevel - baseLevel;
  const baseHp = averageFromHitDice(base.hitDice, base.hpAvg);
  const hpMax = Math.max(1, baseHp + delta * 4);
  const atkDelta = delta >= 0 ? Math.floor(delta / 2) : Math.ceil(delta / 2);
  return {
    hitDice: base.hitDice,
    ac: Math.max(1, base.ac + delta),
    attackBonus: base.attackBonus + atkDelta,
    damage: scaleDamage(base.damage, delta),
    initMod: base.initMod + Math.floor(delta / 3),
    speed: Math.max(0, base.speed),
    hpMax,
  };
}

export function catalogToStatBlock(entry: MonsterCatalogEntry): Omit<MonsterStatBlock, 'hpMax'> & {
  hpAvg?: number | null;
} {
  return {
    hitDice: entry.hitDice,
    ac: entry.ac,
    attackBonus: entry.attackBonus,
    damage: entry.damage,
    initMod: entry.initMod,
    speed: entry.speed,
    hpAvg: entry.hpAvg,
  };
}

/** Roll actual HP from hit dice (each spawn differs). */
export function rollHpFromHitDice(
  hitDice: string,
  randomInt: (min: number, max: number) => number,
): number {
  const notation = hitDice.trim().replace(/\s+/g, '');
  if (!notation) return 8;
  try {
    const result = rollDice(notation, randomInt);
    return Math.max(1, result.total);
  } catch {
    if (!HIT_DICE_RE.test(notation)) return 8;
    const m = notation.match(HIT_DICE_RE);
    if (!m) return 8;
    const count = Number(m[1]);
    const sides = Number(m[2]);
    const bonus = m[3] ? Number(m[3]) : 0;
    if (!Number.isFinite(count) || !Number.isFinite(sides) || sides < 2) return 8;
    let sum = bonus;
    for (let i = 0; i < count; i++) sum += randomInt(1, sides);
    return Math.max(1, sum);
  }
}

/**
 * Apply per-instance variance: rolled HP, small AC/attack jitter.
 */
export function rollMonsterInstanceStats(
  template: MonsterStatBlock & { hpAvg?: number | null; hitDice: string },
  randomInt: (min: number, max: number) => number,
): MonsterStatBlock {
  let hpMax: number;
  if (template.hpAvg != null && template.hpAvg > 0) {
    const jitter = randomInt(-2, 2);
    hpMax = Math.max(1, template.hpAvg + jitter);
  } else {
    hpMax = rollHpFromHitDice(template.hitDice, randomInt);
  }
  const acJitter = randomInt(-1, 1);
  const atkJitter = randomInt(0, 1);
  return {
    hitDice: template.hitDice,
    ac: Math.max(1, template.ac + acJitter),
    attackBonus: template.attackBonus + atkJitter,
    damage: template.damage,
    initMod: template.initMod,
    speed: template.speed,
    hpMax,
  };
}

export function formatMonsterSummary(
  m: Pick<MonsterStatBlock, 'ac' | 'hpMax' | 'attackBonus' | 'damage'> & { hpCurrent?: number },
): string {
  const hp = m.hpCurrent != null ? `${m.hpCurrent}/${m.hpMax} HP` : `${m.hpMax} HP`;
  return `AC ${m.ac} · ${hp} · +${m.attackBonus} ${m.damage}`;
}
