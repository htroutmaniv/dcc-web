/** DCC weapon damage by type (core rulebook). Used for trained weapons and "(as …)" stand-ins. */
const WEAPON_DAMAGE_BY_TYPE: Record<string, string> = {
  club: '1d4',
  dagger: '1d4',
  staff: '1d4+1',
  'short sword': '1d6',
  longsword: '1d8',
  'hand axe': '1d6',
  handaxe: '1d6',
  axe: '1d6',
  spear: '1d8',
  shortbow: '1d6',
  longbow: '1d8',
  sling: '1d4',
  dart: '1d4',
  mace: '1d6',
  pick: '1d6',
  hammer: '1d4',
  cleaver: '1d6',
  shovel: '1d4+1',
  pole: '1d4+1',
  cudgel: '1d4+1',
  crowbar: '1d4',
  awl: '1d4',
  knife: '1d4',
  razor: '1d4',
  chisel: '1d4',
  scissors: '1d4',
  trowel: '1d4',
  quill: '1d4',
  stick: '1d4',
  pitchfork: '1d8',
};

export function weaponDamageForType(type: string): string {
  return WEAPON_DAMAGE_BY_TYPE[type.trim().toLowerCase()] ?? '1d4';
}

/** Parse a funnel trained-weapon cell into display name and combat damage. */
export function parseTrainedWeapon(raw: string): { name: string; damage: string } {
  const trimmed = raw.trim();
  const asMatch = trimmed.match(/^(.+?)\s*\(as\s+(.+?)\)\s*$/i);
  if (asMatch) {
    return {
      name: trimmed,
      damage: weaponDamageForType(asMatch[2]!),
    };
  }
  return {
    name: trimmed,
    damage: weaponDamageForType(trimmed),
  };
}
