import type { Character, User } from '../types/game';

/** Characters the DM controls as NPCs (unassigned or owned by the DM). */
export function isNpcCharacter(character: Character, dmUserId: string): boolean {
  if (!character.ownerUserId || character.ownerUserId === dmUserId) return true;
  return false;
}

export function groupCharactersForDm(
  characters: Character[],
  players: { user: User }[],
  dmUserId: string,
): { playerSections: { id: string; title: string; characters: Character[] }[]; npcs: Character[] } {
  const playerIds = new Set(players.map((p) => p.user.id));
  const playerSections = players.map((p) => ({
    id: p.user.id,
    title: p.user.displayName,
    characters: characters.filter((c) => c.ownerUserId === p.user.id),
  }));
  const npcs = characters.filter(
    (c) =>
      c.ownerUserId === dmUserId ||
      !c.ownerUserId ||
      !playerIds.has(c.ownerUserId),
  );
  return { playerSections, npcs };
}
