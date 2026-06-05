import { formatArmorSummary } from '@dcc-web/shared';
import type { Character, CharacterItem } from '../types/game';

export interface ArmorStats {
  acBonus: number;
  speedPenalty: number;
  checkPenalty: number;
  fumbleDie: string;
  spellCheckPenalty: number;
}

export interface SheetArmorEntry {
  id: string;
  name: string;
  acBonus: number;
  speedPenalty: number;
  checkPenalty: number;
  fumbleDie: string;
  spellCheckPenalty: number;
  label: string;
}

export const NO_EQUIP_ID = '';

/** @deprecated use NO_EQUIP_ID */
export const NO_ARMOR_ID = NO_EQUIP_ID;

export function isShieldItem(item: CharacterItem): boolean {
  const slot = item.properties?.slot as string | undefined;
  if (slot === 'shield') return true;
  if (slot === 'body') return false;
  return /\bshield\b/i.test(item.name);
}

export function isBodyArmorItem(item: CharacterItem): boolean {
  return item.category === 'armor' && !isShieldItem(item);
}

export function getBodyArmorItems(character: Character): CharacterItem[] {
  return (character.items ?? []).filter(isBodyArmorItem);
}

export function getShieldItems(character: Character): CharacterItem[] {
  return (character.items ?? []).filter(
    (i) => i.category === 'armor' && isShieldItem(i),
  );
}

export function armorStatsFromItem(item: CharacterItem): ArmorStats {
  return {
    acBonus: Number(item.properties?.acBonus ?? 0),
    speedPenalty: Number(item.properties?.speedPenalty ?? 0),
    checkPenalty: Number(item.properties?.checkPenalty ?? 0),
    fumbleDie: String(item.properties?.fumbleDie ?? ''),
    spellCheckPenalty: Number(item.properties?.spellCheckPenalty ?? 0),
  };
}

export function combineArmorStats(
  body: ArmorStats | null,
  shield: ArmorStats | null,
): ArmorStats | null {
  if (!body && !shield) return null;
  return {
    acBonus: (body?.acBonus ?? 0) + (shield?.acBonus ?? 0),
    speedPenalty: (body?.speedPenalty ?? 0) + (shield?.speedPenalty ?? 0),
    checkPenalty: (body?.checkPenalty ?? 0) + (shield?.checkPenalty ?? 0),
    fumbleDie: body?.fumbleDie || shield?.fumbleDie || '',
    spellCheckPenalty:
      (body?.spellCheckPenalty ?? 0) + (shield?.spellCheckPenalty ?? 0),
  };
}

export function formatArmorLabel(item: CharacterItem): string {
  const summary = formatArmorSummary(item.properties);
  return `${item.name} (${summary})`;
}

function storedId(custom: Record<string, unknown>, key: string): string | null {
  const id = custom[key];
  if (id === NO_EQUIP_ID || id == null || id === '') return null;
  return typeof id === 'string' ? id : null;
}

export function resolveSelectedBodyArmorId(character: Character): string | null {
  const armors = getBodyArmorItems(character);
  if (armors.length === 0) return null;

  const custom = character.stats?.custom ?? {};
  if (custom.selectedArmorId === NO_EQUIP_ID) return null;

  let selectedId = storedId(custom, 'selectedArmorId');
  if (selectedId && armors.some((a) => a.id === selectedId)) {
    return selectedId;
  }

  const byName = custom.selectedArmorName as string | undefined;
  if (byName) {
    const match = armors.find((a) => a.name === byName);
    if (match) return match.id;
  }

  return null;
}

export function resolveSelectedShieldId(character: Character): string | null {
  const shields = getShieldItems(character);
  if (shields.length === 0) return null;

  const custom = character.stats?.custom ?? {};

  if (custom.selectedShieldId === NO_EQUIP_ID) return null;

  let selectedId = storedId(custom, 'selectedShieldId');
  if (selectedId && shields.some((s) => s.id === selectedId)) {
    return selectedId;
  }

  // Legacy: body slot id may have pointed at a shield
  const legacyBodyId = storedId(custom, 'selectedArmorId');
  if (legacyBodyId && shields.some((s) => s.id === legacyBodyId)) {
    return legacyBodyId;
  }

  const byName = custom.selectedShieldName as string | undefined;
  if (byName) {
    const match = shields.find((s) => s.name === byName);
    if (match) return match.id;
  }

  return null;
}

/** @deprecated use resolveSelectedBodyArmorId */
export function resolveSelectedArmorId(character: Character): string | null {
  return resolveSelectedBodyArmorId(character);
}

export function getActiveBodyArmor(character: Character): CharacterItem | undefined {
  const id = resolveSelectedBodyArmorId(character);
  if (!id) return undefined;
  return getBodyArmorItems(character).find((a) => a.id === id);
}

export function getActiveShield(character: Character): CharacterItem | undefined {
  const id = resolveSelectedShieldId(character);
  if (!id) return undefined;
  return getShieldItems(character).find((s) => s.id === id);
}

/** @deprecated use getActiveBodyArmor */
export function getActiveArmor(character: Character): CharacterItem | undefined {
  return getActiveBodyArmor(character);
}

export function getEquippedArmorStats(character: Character): ArmorStats | null {
  const body = getActiveBodyArmor(character);
  const shield = getActiveShield(character);
  return combineArmorStats(
    body ? armorStatsFromItem(body) : null,
    shield ? armorStatsFromItem(shield) : null,
  );
}

export function unarmoredAc(agilityMod: number): number {
  return 10 + agilityMod;
}

export function computeAc(agilityMod: number, equipped: ArmorStats | null): number {
  return unarmoredAc(agilityMod) + (equipped?.acBonus ?? 0);
}

export function getBaseSpeed(character: Character): number {
  const custom = character.stats?.custom ?? {};
  const fromCustom = custom.baseSpeed;
  if (typeof fromCustom === 'number' && !Number.isNaN(fromCustom)) {
    return fromCustom;
  }
  const current = character.stats?.speed ?? 30;
  const body = getActiveBodyArmor(character);
  if (body) {
    const penalty = armorStatsFromItem(body).speedPenalty;
    return Math.max(0, current - penalty);
  }
  return current;
}

export function computeEffectiveSpeed(
  baseSpeed: number,
  equipped: ArmorStats | null,
): number {
  return Math.max(0, baseSpeed + (equipped?.speedPenalty ?? 0));
}

function buildEntry(item: CharacterItem): SheetArmorEntry {
  const s = armorStatsFromItem(item);
  return {
    id: item.id,
    name: item.name,
    acBonus: s.acBonus,
    speedPenalty: s.speedPenalty,
    checkPenalty: s.checkPenalty,
    fumbleDie: s.fumbleDie,
    spellCheckPenalty: s.spellCheckPenalty,
    label: formatArmorLabel(item),
  };
}

export function buildBodyArmorEntries(character: Character): SheetArmorEntry[] {
  return getBodyArmorItems(character).map(buildEntry);
}

export function buildShieldEntries(character: Character): SheetArmorEntry[] {
  return getShieldItems(character).map(buildEntry);
}

/** Body armor only (excludes shields). */
export function buildArmorEntries(character: Character): SheetArmorEntry[] {
  return buildBodyArmorEntries(character);
}

export function armorStatsFromEntry(entry: SheetArmorEntry | undefined): ArmorStats | null {
  if (!entry) return null;
  return {
    acBonus: entry.acBonus,
    speedPenalty: entry.speedPenalty,
    checkPenalty: entry.checkPenalty,
    fumbleDie: entry.fumbleDie,
    spellCheckPenalty: entry.spellCheckPenalty,
  };
}

export function equippedStatsFromSheet(data: {
  armorEntries: SheetArmorEntry[];
  shieldEntries: SheetArmorEntry[];
  selectedArmorId: string | null;
  selectedShieldId: string | null;
}): ArmorStats | null {
  const body = data.armorEntries.find((a) => a.id === data.selectedArmorId);
  const shield = data.shieldEntries.find((s) => s.id === data.selectedShieldId);
  return combineArmorStats(armorStatsFromEntry(body), armorStatsFromEntry(shield));
}

export function deriveArmorOnSheet(data: {
  abilities: { key: string; mod: number }[];
  armorEntries: SheetArmorEntry[];
  shieldEntries: SheetArmorEntry[];
  selectedArmorId: string | null;
  selectedShieldId: string | null;
  baseSpeed: number;
}): { ac: number; speed: number } {
  const agiMod = data.abilities.find((a) => a.key === 'agi')?.mod ?? 0;
  const equipped = equippedStatsFromSheet(data);
  return {
    ac: computeAc(agiMod, equipped),
    speed: computeEffectiveSpeed(data.baseSpeed, equipped),
  };
}

export function acBreakdown(
  agilityMod: number,
  body: ArmorStats | null,
  shield: ArmorStats | null,
): string {
  const parts = [`10`, agilityMod >= 0 ? `+${agilityMod} Agi` : `${agilityMod} Agi`];
  if (body?.acBonus) parts.push(`+${body.acBonus} armor`);
  if (shield?.acBonus) parts.push(`+${shield.acBonus} shield`);
  return parts.join(' ');
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Stat lines for one armor or shield piece (always shows AC bonus when equipped). */
export function formatPieceStatLines(entry: SheetArmorEntry): string[] {
  const lines: string[] = [`AC ${signed(entry.acBonus)}`];
  if (entry.speedPenalty !== 0) lines.push(`Speed ${entry.speedPenalty} ft`);
  if (entry.checkPenalty !== 0) lines.push(`Check penalty ${signed(entry.checkPenalty)}`);
  if (entry.fumbleDie) lines.push(`Fumble die ${entry.fumbleDie}`);
  if (entry.spellCheckPenalty !== 0) {
    lines.push(`Spell check ${signed(entry.spellCheckPenalty)}`);
  }
  return lines;
}

/** Combined defense stats shown on the sheet (AC, speed, penalties). */
export function formatDefenseLines(opts: {
  agiMod: number;
  ac: number;
  baseSpeed: number;
  speed: number;
  body: ArmorStats | null;
  shield: ArmorStats | null;
}): string[] {
  const { agiMod, ac, baseSpeed, speed, body, shield } = opts;
  const lines: string[] = [
    `AC ${ac} (${acBreakdown(agiMod, body, shield)})`,
  ];

  const speedPenalty = (body?.speedPenalty ?? 0) + (shield?.speedPenalty ?? 0);
  if (speedPenalty !== 0) {
    lines.push(`Speed ${speed} ft (base ${baseSpeed}, armor ${speedPenalty} ft)`);
  } else {
    lines.push(`Speed ${speed} ft`);
  }

  const check = (body?.checkPenalty ?? 0) + (shield?.checkPenalty ?? 0);
  if (check !== 0) lines.push(`Check penalty ${signed(check)}`);

  const fumble = body?.fumbleDie || shield?.fumbleDie;
  if (fumble) lines.push(`Fumble die ${fumble}`);

  const spell = (body?.spellCheckPenalty ?? 0) + (shield?.spellCheckPenalty ?? 0);
  if (spell !== 0) lines.push(`Spell check ${signed(spell)}`);

  return lines;
}
