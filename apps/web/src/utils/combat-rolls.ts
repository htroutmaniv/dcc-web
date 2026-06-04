import type { Character, CharacterItem } from '../types/game';

export type CombatRollKind = 'initiative' | 'toHit' | 'damage';

export interface CombatRollSpec {
  notation: string;
  reason: string;
}

function formatModifier(mod: number): string {
  if (mod === 0) return '';
  return mod > 0 ? `+${mod}` : `${mod}`;
}

function primaryWeapon(character: Character): CharacterItem | undefined {
  return (character.items ?? []).find((i) => i.category === 'weapon');
}

export function getCombatRollSpec(
  character: Character,
  kind: CombatRollKind,
): CombatRollSpec {
  const name = character.name;

  if (kind === 'initiative') {
    const mod = character.stats?.initiative ?? 0;
    return {
      notation: `1d20${formatModifier(mod)}`,
      reason: `${name} — initiative`,
    };
  }

  const weapon = primaryWeapon(character);
  const attackBonus = Number(weapon?.properties?.attackBonus ?? 0);
  const damageNotation = String(weapon?.properties?.damage ?? '1d4').replace(/\s/g, '');

  if (kind === 'toHit') {
    return {
      notation: `1d20${formatModifier(attackBonus)}`,
      reason: `${name} — attack${weapon ? ` (${weapon.name})` : ''}`,
    };
  }

  return {
    notation: damageNotation,
    reason: `${name} — damage${weapon ? ` (${weapon.name})` : ''}`,
  };
}
