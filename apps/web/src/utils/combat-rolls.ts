import type { Character } from '../types/game';
import { getActiveWeapon, weaponStatsFromItem } from './weapons';

export type CombatRollKind = 'initiative' | 'toHit' | 'damage';

export interface CombatRollSpec {
  notation: string;
  reason: string;
}

function formatModifier(mod: number): string {
  if (mod === 0) return '';
  return mod > 0 ? `+${mod}` : `${mod}`;
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

  const weapon = getActiveWeapon(character);
  const { attackBonus, damage } = weapon
    ? weaponStatsFromItem(weapon)
    : { attackBonus: 0, damage: '1d4' };

  if (kind === 'toHit') {
    return {
      notation: `1d20${formatModifier(attackBonus)}`,
      reason: `${name} — attack${weapon ? ` (${weapon.name})` : ''}`,
    };
  }

  return {
    notation: damage,
    reason: `${name} — damage${weapon ? ` (${weapon.name})` : ''}`,
  };
}
