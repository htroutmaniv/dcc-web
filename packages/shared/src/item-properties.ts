import type { ItemCategory } from './types.js';

export type EquipmentSectionKey = 'consumables' | 'weapon' | 'armor' | 'misc';

/** UI section → DB category */
export const EQUIPMENT_SECTION_TO_CATEGORY: Record<
  EquipmentSectionKey,
  ItemCategory
> = {
  consumables: 'disposable',
  weapon: 'weapon',
  armor: 'armor',
  misc: 'misc',
};

export const EQUIPMENT_SECTIONS: { key: EquipmentSectionKey; label: string }[] = [
  { key: 'consumables', label: 'Consumables' },
  { key: 'weapon', label: 'Weapons' },
  { key: 'armor', label: 'Armor' },
  { key: 'misc', label: 'Misc' },
];

export interface WeaponProperties {
  damage?: string;
  attackBonus?: number;
}

export interface ArmorProperties {
  acBonus?: number;
  speedPenalty?: number;
  checkPenalty?: number;
  fumbleDie?: string;
  spellCheckPenalty?: number;
}

export function formatWeaponSummary(properties?: Record<string, unknown>): string {
  const damage = properties?.damage as string | undefined;
  const bonus = Number(properties?.attackBonus ?? 0);
  const parts: string[] = [];
  if (damage) parts.push(damage);
  if (bonus !== 0) parts.push(`atk ${bonus >= 0 ? '+' : ''}${bonus}`);
  return parts.length ? parts.join(' · ') : '—';
}

export function formatArmorSummary(properties?: Record<string, unknown>): string {
  const ac = properties?.acBonus;
  if (ac == null) return '—';
  return `AC +${ac}`;
}

export function armorTooltipLines(properties?: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const ac = properties?.acBonus;
  if (ac != null) lines.push(`AC bonus: +${ac}`);
  const speed = properties?.speedPenalty;
  if (speed != null && speed !== 0) lines.push(`Speed: ${speed} ft`);
  const check = properties?.checkPenalty;
  if (check != null && check !== 0) lines.push(`Check penalty: ${check}`);
  const fumble = properties?.fumbleDie as string | undefined;
  if (fumble) lines.push(`Fumble die: ${fumble}`);
  const spell = properties?.spellCheckPenalty;
  if (spell != null && spell !== 0) lines.push(`Spell check: ${spell}`);
  return lines;
}
