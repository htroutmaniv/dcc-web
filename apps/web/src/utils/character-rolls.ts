import { computeDccSaves, parseStoredSaves } from '@dcc-web/shared';
import type { Character } from '../types/game';
import { getActiveWeapon, weaponStatsFromItem } from './weapons';

export type CombatRollKind = 'initiative' | 'toHit' | 'damage';

export type SaveRollKind = 'saveReflex' | 'saveFortitude' | 'saveWill';

export type AbilityRollKind = 'str' | 'agi' | 'sta' | 'per' | 'int' | 'lck';

export type CharacterRollKind = CombatRollKind | SaveRollKind | AbilityRollKind;

export interface CharacterRollSpec {
  notation: string;
  reason: string;
  /** Short hint shown on the roll button (e.g. "+2", "1d8"). */
  hint: string;
}

const ABILITY_LABELS: Record<AbilityRollKind, string> = {
  str: 'Strength',
  agi: 'Agility',
  sta: 'Stamina',
  per: 'Personality',
  int: 'Intelligence',
  lck: 'Luck',
};

const SAVE_LABELS: Record<SaveRollKind, string> = {
  saveReflex: 'Reflex',
  saveFortitude: 'Fortitude',
  saveWill: 'Will',
};

function formatModifier(mod: number): string {
  if (mod === 0) return '+0';
  return mod > 0 ? `+${mod}` : `${mod}`;
}

function d20Roll(mod: number): Pick<CharacterRollSpec, 'notation' | 'hint'> {
  return {
    notation: `1d20${mod >= 0 ? `+${mod}` : mod}`,
    hint: formatModifier(mod),
  };
}

function getSavesForCharacter(character: Character) {
  const stored = parseStoredSaves(character.stats?.saves);
  if (stored) return stored;

  const abilities = character.stats?.abilities ?? {};
  const classForSaves =
    character.level > 0 ? character.className : undefined;
  return computeDccSaves({
    level: character.level,
    className: classForSaves,
    agilityMod: abilities.agi?.modifier ?? 0,
    staminaMod: abilities.sta?.modifier ?? 0,
    personalityMod: abilities.per?.modifier ?? 0,
  });
}

function abilityMod(character: Character, key: AbilityRollKind): number {
  return character.stats?.abilities?.[key]?.modifier ?? 0;
}

export function getCharacterRollSpec(
  character: Character,
  kind: CharacterRollKind,
): CharacterRollSpec {
  const name = character.name;

  if (kind === 'initiative') {
    const mod = character.stats?.initiative ?? 0;
    const roll = d20Roll(mod);
    return {
      ...roll,
      reason: `${name} — initiative`,
    };
  }

  if (kind === 'toHit' || kind === 'damage') {
    const weapon = getActiveWeapon(character);
    const { attackBonus, damage } = weapon
      ? weaponStatsFromItem(weapon)
      : { attackBonus: 0, damage: '1d4' };

    if (kind === 'toHit') {
      const roll = d20Roll(attackBonus);
      return {
        ...roll,
        reason: `${name} — attack${weapon ? ` (${weapon.name})` : ''}`,
      };
    }

    return {
      notation: damage,
      hint: damage,
      reason: `${name} — damage${weapon ? ` (${weapon.name})` : ''}`,
    };
  }

  if (kind === 'saveReflex' || kind === 'saveFortitude' || kind === 'saveWill') {
    const saves = getSavesForCharacter(character);
    const mod =
      kind === 'saveReflex'
        ? saves.reflex
        : kind === 'saveFortitude'
          ? saves.fortitude
          : saves.will;
    const roll = d20Roll(mod);
    return {
      ...roll,
      reason: `${name} — ${SAVE_LABELS[kind]} save`,
    };
  }

  const mod = abilityMod(character, kind);
  const roll = d20Roll(mod);
  return {
    ...roll,
    reason: `${name} — ${ABILITY_LABELS[kind]} check`,
  };
}

/** @deprecated use getCharacterRollSpec */
export function getCombatRollSpec(
  character: Character,
  kind: CombatRollKind,
): { notation: string; reason: string } {
  const spec = getCharacterRollSpec(character, kind);
  return { notation: spec.notation, reason: spec.reason };
}

export const CHARACTER_QUICK_ROLL_SECTIONS: {
  title: string;
  rolls: { kind: CharacterRollKind; label: string }[];
}[] = [
  {
    title: 'Combat',
    rolls: [
      { kind: 'initiative', label: 'Initiative' },
      { kind: 'toHit', label: 'Attack' },
      { kind: 'damage', label: 'Damage' },
    ],
  },
  {
    title: 'Saving throws',
    rolls: [
      { kind: 'saveReflex', label: 'Reflex' },
      { kind: 'saveFortitude', label: 'Fortitude' },
      { kind: 'saveWill', label: 'Will' },
    ],
  },
  {
    title: 'Ability checks',
    rolls: [
      { kind: 'str', label: 'Strength' },
      { kind: 'agi', label: 'Agility' },
      { kind: 'sta', label: 'Stamina' },
      { kind: 'per', label: 'Personality' },
      { kind: 'int', label: 'Intelligence' },
      { kind: 'lck', label: 'Luck' },
    ],
  },
];
