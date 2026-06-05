import type { Character, CharacterItem } from '../types/game';

export interface WeaponStats {
  attackBonus: number;
  damage: string;
}

export function getWeaponItems(character: Character): CharacterItem[] {
  return (character.items ?? []).filter((i) => i.category === 'weapon');
}

export function weaponStatsFromItem(item: CharacterItem): WeaponStats {
  return {
    attackBonus: Number(item.properties?.attackBonus ?? 0),
    damage: String(item.properties?.damage ?? '1d4').replace(/\s/g, ''),
  };
}

export function formatWeaponLabel(item: CharacterItem): string {
  const { attackBonus, damage } = weaponStatsFromItem(item);
  const mod =
    attackBonus !== 0 ? ` ${attackBonus >= 0 ? '+' : ''}${attackBonus}` : '';
  return `${item.name}${mod} (${damage})`;
}

export function getStoredSelectedWeaponId(character: Character): string | null {
  const id = character.stats?.custom?.selectedWeaponId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function resolveSelectedWeaponId(character: Character): string | null {
  const weapons = getWeaponItems(character);
  if (weapons.length === 0) return null;

  const custom = character.stats?.custom ?? {};
  let selectedId = getStoredSelectedWeaponId(character);

  if (selectedId && weapons.some((w) => w.id === selectedId)) {
    return selectedId;
  }

  const byName = custom.selectedWeaponName as string | undefined;
  if (byName) {
    const match = weapons.find((w) => w.name === byName);
    if (match) return match.id;
  }

  return weapons[0]!.id;
}

export function getActiveWeapon(character: Character): CharacterItem | undefined {
  const weapons = getWeaponItems(character);
  if (weapons.length === 0) return undefined;
  const selectedId = resolveSelectedWeaponId(character);
  return weapons.find((w) => w.id === selectedId) ?? weapons[0];
}
