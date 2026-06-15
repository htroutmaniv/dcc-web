import {
  abilityModifier,
  computeDccSaves,
  formatStackUsesSummary,
  normalizeCharacterRace,
  resolveCharacterRace,
  usesPerUnit,
  type CharacterRace,
} from '@dcc-web/shared';
import type { Character } from '../types/game';
import {
  formatArmorSummary,
  formatWeaponSummary,
  formatCharacterVitalityBadge,
  getCharacterVitality,
} from '@dcc-web/shared';
import {
  buildBodyArmorEntries,
  buildShieldEntries,
  deriveArmorOnSheet,
  getBaseSpeed,
  resolveSelectedBodyArmorId,
  resolveSelectedShieldId,
} from './armor';
import {
  formatWeaponLabel,
  getWeaponItems,
  resolveSelectedWeaponId,
  weaponStatsFromItem,
} from './weapons';
import type { CharacterItem } from '../types/game';
import type { SheetArmorEntry } from './armor';

function formatEquipmentLine(item: CharacterItem): string {
  const qty = item.quantity > 1 ? ` (×${item.quantity})` : '';
  const per = usesPerUnit(item.properties);
  const useNote =
    per > 1 || item.properties?.usesRemaining != null
      ? ` — ${formatStackUsesSummary(item)}`
      : '';
  if (item.category === 'armor') {
    const ac = formatArmorSummary(item.properties);
    return `${item.name}${qty} — ${ac}`;
  }
  if (item.category === 'weapon') {
    return `${item.name}${qty} — ${formatWeaponSummary(item.properties)}`;
  }
  return `${item.name}${qty}${useNote}`;
}

export interface SheetWeaponEntry {
  id: string;
  name: string;
  attackBonus: number;
  damage: string;
  label: string;
}

export interface Level0SheetData {
  name: string;
  /** Funnel (0-level) race; stored in stats.custom.race */
  race: CharacterRace;
  occupation: string;
  alignment: string;
  ac: number;
  hp: number;
  hpMax: number;
  vitalityLabel?: string | null;
  abilities: { key: string; label: string; score: number; mod: number }[];
  saves: { reflex: number; fortitude: number; will: number };
  /** Editable weapon lines (up to 3 slots). */
  weapons: string[];
  weaponEntries: SheetWeaponEntry[];
  selectedWeaponId: string | null;
  armorEntries: SheetArmorEntry[];
  shieldEntries: SheetArmorEntry[];
  selectedArmorId: string | null;
  selectedShieldId: string | null;
  baseSpeed: number;
  speed: number;
  init: number;
  equipment: string[];
  notes: string;
  xp: string;
  level: number;
  status: string;
  isDead: boolean;
}

export const ABILITY_ROWS: { key: string; label: string }[] = [
  { key: 'str', label: 'Strength' },
  { key: 'agi', label: 'Agility' },
  { key: 'sta', label: 'Stamina' },
  { key: 'per', label: 'Personality' },
  { key: 'int', label: 'Intelligence' },
  { key: 'lck', label: 'Luck' },
];

export { abilityModifier };

function parseWeaponLine(line: string): {
  name: string;
  properties: Record<string, unknown>;
} {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '—') {
    return { name: '—', properties: {} };
  }
  const paren = /\(([^)]+)\)\s*$/.exec(trimmed);
  const damage = paren?.[1];
  const before = paren ? trimmed.slice(0, paren.index).trim() : trimmed;
  const bonusMatch = /([+-]\d+)\s*$/.exec(before);
  const name = bonusMatch ? before.slice(0, bonusMatch.index).trim() : before;
  const properties: Record<string, unknown> = {};
  if (damage) properties.damage = damage;
  if (bonusMatch) properties.attackBonus = Number.parseInt(bonusMatch[1], 10);
  return { name: name || trimmed, properties };
}

/** Populated from stats.custom on the sheet — must not live in character.notes */
const DERIVED_NOTE_LINE = /^(Lucky Sign|Languages):/i;

export function stripDerivedNoteLines(notes: string): string {
  return notes
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !DERIVED_NOTE_LINE.test(trimmed);
    })
    .join('\n')
    .trim();
}

export function mapCharacterToLevel0Sheet(character: Character): Level0SheetData {
  const stats = character.stats ?? {};
  const combat = character.combat ?? {};
  const custom = stats.custom ?? {};
  const abilities = stats.abilities ?? {};
  const agiMod = abilities.agi?.modifier ?? 0;
  const staMod = abilities.sta?.modifier ?? 0;
  const perMod = abilities.per?.modifier ?? 0;
  const leveledClass =
    character.level > 0
      ? character.className
      : undefined;
  const computedSaves = computeDccSaves({
    level: character.level,
    className: leveledClass,
    agilityMod: agiMod,
    staminaMod: staMod,
    personalityMod: perMod,
  });
  // Prefer rules-based saves so leveled characters display correct class bonuses.
  const saves = computedSaves;

  const abilityRows = ABILITY_ROWS.map(({ key, label }) => {
    const a = abilities[key] ?? { score: 10, modifier: 0 };
    return { key, label, score: a.score, mod: a.modifier };
  });

  const weaponItems = getWeaponItems(character);
  const weaponEntries: SheetWeaponEntry[] = weaponItems.map((item) => {
    const stats = weaponStatsFromItem(item);
    return {
      id: item.id,
      name: item.name,
      attackBonus: stats.attackBonus,
      damage: stats.damage,
      label: formatWeaponLabel(item),
    };
  });
  const weapons = weaponEntries.map((w) => w.label);
  const selectedWeaponId = resolveSelectedWeaponId(character);
  const armorEntries = buildBodyArmorEntries(character);
  const shieldEntries = buildShieldEntries(character);
  const selectedArmorId = resolveSelectedBodyArmorId(character) ?? '';
  const selectedShieldId = resolveSelectedShieldId(character) ?? '';
  const baseSpeed = getBaseSpeed(character);
  const { ac, speed: effectiveSpeed } = deriveArmorOnSheet({
    abilities: abilityRows,
    armorEntries,
    shieldEntries,
    selectedArmorId,
    selectedShieldId,
    baseSpeed,
  });
  const equipment = (character.items ?? [])
    .filter((i) => i.category !== 'weapon' && i.category !== 'armor')
    .map(formatEquipmentLine);

  const notesParts: string[] = [];
  const freeformNotes = stripDerivedNoteLines(character.notes?.trim() ?? '');
  if (freeformNotes) notesParts.push(freeformNotes);
  const lucky = custom.luckySign as string | undefined;
  if (lucky) notesParts.push(`Lucky Sign: ${lucky}`);
  const langs = custom.languages as string | undefined;
  if (langs) notesParts.push(`Languages: ${langs}`);

  const funds = custom.startingFunds as string | undefined;
  const equipLines = [...equipment];
  if (funds && !equipLines.some((e) => e.toLowerCase().includes('starting funds'))) {
    equipLines.unshift(`Starting Funds: ${funds}`);
  }

  return {
    name: character.name,
    race: resolveCharacterRace(custom as Record<string, unknown>),
    occupation:
      (custom.occupation as string) ||
      character.className ||
      '—',
    alignment: character.alignment || '',
    ac,
    hp: combat.hpCurrent ?? combat.hpMax ?? 1,
    hpMax: combat.hpMax ?? combat.hpCurrent ?? 1,
    vitalityLabel: formatCharacterVitalityBadge({
      level: character.level,
      status: character.status,
      combat,
    }),
    abilities: abilityRows,
    saves: {
      reflex: saves.reflex,
      fortitude: saves.fortitude,
      will: saves.will,
    },
    weapons: weapons.length ? weapons : ['', '', ''],
    weaponEntries,
    selectedWeaponId,
    armorEntries,
    shieldEntries,
    selectedArmorId,
    selectedShieldId,
    baseSpeed,
    speed: effectiveSpeed,
    init: stats.initiative ?? agiMod,
    equipment: equipLines.length ? equipLines : [''],
    notes: notesParts.join('\n') || '',
    xp: (custom.xp as string) || '',
    level: character.level,
    status: character.status,
    isDead:
      character.status === 'dead' ||
      getCharacterVitality({
        level: character.level,
        status: character.status,
        combat,
      }) === 'dead',
  };
}

export function sheetDataToCharacterPatch(
  data: Level0SheetData,
  character: Character,
): Record<string, unknown> {
  const prevStats = character.stats ?? {};
  const prevCustom = (prevStats.custom ?? {}) as Record<string, unknown>;

  const abilities: Record<string, { score: number; modifier: number }> = {};
  for (const ab of data.abilities) {
    abilities[ab.key] = { score: ab.score, modifier: abilityModifier(ab.score) };
  }

  const items: {
    category: 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable';
    name: string;
    quantity: number;
    notes?: string;
    properties?: Record<string, unknown>;
  }[] = [];
  for (const w of data.weapons) {
    const parsed = parseWeaponLine(w);
    if (!parsed.name || parsed.name === '—') continue;
    items.push({
      category: 'weapon',
      name: parsed.name,
      quantity: 1,
      properties: parsed.properties,
    });
  }

  const { ac: computedAc, speed: computedSpeed } = deriveArmorOnSheet(data);

  const selectedEntry = data.weaponEntries.find((w) => w.id === data.selectedWeaponId);
  const selectedWeaponName =
    selectedEntry?.name ??
    (data.weapons
      .map((line) => parseWeaponLine(line).name)
      .find((n) => n && n !== '—') ?? null);
  const selectedArmorName =
    data.armorEntries.find((a) => a.id === data.selectedArmorId)?.name ?? null;
  const selectedShieldName =
    data.shieldEntries.find((s) => s.id === data.selectedShieldId)?.name ?? null;
  for (const item of (character.items ?? []).filter((i) => i.category !== 'weapon')) {
    items.push({
      category: item.category as 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable',
      name: item.name,
      quantity: item.quantity,
      notes: item.notes ?? '',
      properties: (item.properties ?? {}) as Record<string, unknown>,
    });
  }
  const startingFunds = prevCustom.startingFunds as string | undefined;

  return {
    name: data.name.trim(),
    className: data.occupation.trim() || character.className,
    alignment: data.alignment.trim(),
    notes: stripDerivedNoteLines(data.notes.trim()),
    stats: {
      ...prevStats,
      abilities,
      saves: {
        ref: data.saves.reflex,
        frt: data.saves.fortitude,
        wil: data.saves.will,
      },
      speed: computedSpeed,
      initiative: data.init,
      custom: {
        ...prevCustom,
        occupation: data.occupation.trim(),
        race: normalizeCharacterRace(data.race),
        xp: data.xp.trim(),
        baseSpeed: data.baseSpeed,
        ...(startingFunds ? { startingFunds } : {}),
        selectedWeaponId: data.selectedWeaponId ?? '',
        ...(selectedWeaponName ? { selectedWeaponName } : {}),
        selectedArmorId: data.selectedArmorId ?? '',
        ...(selectedArmorName ? { selectedArmorName } : {}),
        selectedShieldId: data.selectedShieldId ?? '',
        ...(selectedShieldName ? { selectedShieldName } : {}),
      },
    },
    combat: {
      ...(character.combat ?? {}),
      ac: computedAc,
      hpCurrent: data.hp,
      hpMax: character.combat?.hpMax ?? data.hpMax,
    },
    items,
  };
}

export function isLevel0Sheet(character: Character): boolean {
  return character.level === 0;
}
