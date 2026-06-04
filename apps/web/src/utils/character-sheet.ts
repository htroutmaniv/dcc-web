import type { Character } from '../types/game';

export interface Level0SheetData {
  name: string;
  occupation: string;
  alignment: string;
  ac: number;
  hp: number;
  abilities: { key: string; label: string; score: number; mod: number }[];
  saves: { reflex: number; fortitude: number; will: number };
  weapons: string[];
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

export function abilityModifier(score: number): number {
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 7) return -1;
  if (score <= 13) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3;
}

function formatWeapon(item: { name: string; properties?: Record<string, unknown> }): string {
  const dmg = item.properties?.damage as string | undefined;
  const bonus = item.properties?.attackBonus as number | undefined;
  if (dmg) {
    const mod = bonus != null ? ` ${bonus >= 0 ? '+' : ''}${bonus}` : '';
    return `${item.name}${mod} (${dmg})`;
  }
  return item.name;
}

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

export function mapCharacterToLevel0Sheet(character: Character): Level0SheetData {
  const stats = character.stats ?? {};
  const combat = character.combat ?? {};
  const custom = stats.custom ?? {};
  const abilities = stats.abilities ?? {};
  const saves = stats.saves ?? {};

  const abilityRows = ABILITY_ROWS.map(({ key, label }) => {
    const a = abilities[key] ?? { score: 10, modifier: 0 };
    return { key, label, score: a.score, mod: a.modifier };
  });

  const items = character.items ?? [];
  const weapons = items
    .filter((i) => i.category === 'weapon')
    .map(formatWeapon);
  const equipment = items
    .filter((i) => i.category !== 'weapon')
    .map((i) => {
      const qty = i.quantity > 1 ? ` (×${i.quantity})` : '';
      const note = i.notes?.trim() ? ` (${i.notes})` : '';
      return `${i.name}${qty}${note}`;
    });

  const notesParts: string[] = [];
  if (character.notes?.trim()) notesParts.push(character.notes.trim());
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
    occupation:
      (custom.occupation as string) ||
      character.className ||
      '—',
    alignment: character.alignment || '',
    ac: combat.ac ?? 10,
    hp: combat.hpCurrent ?? combat.hpMax ?? 1,
    abilities: abilityRows,
    saves: {
      reflex: Number(saves.ref ?? saves.reflex ?? 0),
      fortitude: Number(saves.frt ?? saves.fortitude ?? 0),
      will: Number(saves.wil ?? saves.will ?? 0),
    },
    weapons: weapons.length ? weapons : ['', '', ''],
    speed: stats.speed ?? 30,
    init: stats.initiative ?? 0,
    equipment: equipLines.length ? equipLines : [''],
    notes: notesParts.join('\n') || '',
    xp: (custom.xp as string) || '',
    level: character.level,
    status: character.status,
    isDead: character.status === 'dead',
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
  for (const line of data.equipment) {
    const t = line.trim().replace(/^•\s*/, '');
    if (!t || t === '—') continue;
    if (/^starting funds:/i.test(t)) continue;
    items.push({ category: 'misc', name: t, quantity: 1 });
  }
  const fundsMatch = data.equipment.find((e) => /^starting funds:/i.test(e.trim()));
  const startingFunds = fundsMatch
    ? fundsMatch.replace(/^starting funds:\s*/i, '').trim()
    : (prevCustom.startingFunds as string | undefined);

  return {
    name: data.name.trim(),
    className: data.occupation.trim() || character.className,
    alignment: data.alignment.trim(),
    notes: data.notes.trim(),
    stats: {
      ...prevStats,
      abilities,
      saves: {
        ref: data.saves.reflex,
        frt: data.saves.fortitude,
        wil: data.saves.will,
      },
      speed: data.speed,
      initiative: data.init,
      custom: {
        ...prevCustom,
        occupation: data.occupation.trim(),
        xp: data.xp.trim(),
        ...(startingFunds ? { startingFunds } : {}),
      },
    },
    combat: {
      ...(character.combat ?? {}),
      ac: data.ac,
      hpCurrent: data.hp,
      hpMax: Math.max(data.hp, character.combat?.hpMax ?? data.hp),
    },
    items,
  };
}

export function isLevel0Sheet(character: Character): boolean {
  return character.level === 0;
}
