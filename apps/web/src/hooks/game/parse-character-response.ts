import type { Character } from '../../types/game';

/** Normalize API responses that return either `{ character }` or a bare character. */
export function parseCharacterResponse(
  res: { character: Character } | Character,
): Character | null {
  if (res && typeof res === 'object' && 'character' in res) {
    return res.character;
  }
  const bare = res as Character;
  return bare?.id ? bare : null;
}
