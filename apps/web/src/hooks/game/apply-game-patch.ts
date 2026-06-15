import type { Dispatch, SetStateAction } from 'react';
import type { GamePatch, GameInitiativeState, GameSettings } from '@dcc-web/shared';
import { validateGamePatch } from '@dcc-web/shared';
import type { Character, GameMonsterInstance } from '../../types/game';
import type { TacticalGameMap } from '../../types/map';
import { parseMapTokenPatch } from '../../utils/map-token-patch';
import { parseCharacterResponse } from './parse-character-response.js';

export type ApplyGamePatchHandlers = {
  applyCharacterFromServer: (character: Character) => void;
  setCharacters: Dispatch<SetStateAction<Character[]>>;
  setSelectedCharacter: Dispatch<SetStateAction<Character | null>>;
  handleMonsterUpdated: (monster: GameMonsterInstance) => void;
  setMonsters: Dispatch<SetStateAction<GameMonsterInstance[]>>;
  setSelectedMonster: Dispatch<SetStateAction<GameMonsterInstance | null>>;
  setMaps: Dispatch<SetStateAction<TacticalGameMap[]>>;
  setActiveMapId: Dispatch<SetStateAction<string | null>>;
  applyMapFromServer: (map: TacticalGameMap) => void;
  applyMapTokenFromServer: (patch: ReturnType<typeof parseMapTokenPatch> & { id: string; mapId: string }) => void;
  removeMapTokens: (tokenIds: string[], mapId?: string) => void;
  applyInitiative: (next: GameInitiativeState | null) => void;
  applyGameSettingsPatch: (patch: Partial<GameSettings>) => void;
};

export function applyGamePatch(raw: unknown, handlers: ApplyGamePatchHandlers): void {
  const patch = validateGamePatch(raw);

  for (const row of patch.characters?.upserted ?? []) {
    const character = parseCharacterResponse(
      row as { character: Character } | Character,
    );
    if (!character) {
      throw new Error('Invalid game patch: character upsert could not be parsed');
    }
    handlers.applyCharacterFromServer(character);
  }

  const deletedCharacterIds = patch.characters?.deletedIds ?? [];
  if (deletedCharacterIds.length > 0) {
    const removed = new Set(deletedCharacterIds);
    handlers.setCharacters((prev) => prev.filter((c) => !removed.has(c.id)));
    handlers.setSelectedCharacter((prev) => (prev && removed.has(prev.id) ? null : prev));
  }

  for (const row of patch.monsters?.upserted ?? []) {
    if (!row || typeof row !== 'object' || !('id' in row) || typeof (row as { id: unknown }).id !== 'string') {
      throw new Error('Invalid game patch: monster upsert missing id');
    }
    handlers.handleMonsterUpdated(row as GameMonsterInstance);
  }

  const deletedMonsterIds = patch.monsters?.deletedIds ?? [];
  if (deletedMonsterIds.length > 0) {
    const removed = new Set(deletedMonsterIds);
    handlers.setMonsters((prev) => prev.filter((m) => !removed.has(m.id)));
    handlers.setSelectedMonster((prev) => (prev && removed.has(prev.id) ? null : prev));
  }

  const deletedMapIds = patch.maps?.deletedIds ?? [];
  if (deletedMapIds.length > 0) {
    const removed = new Set(deletedMapIds);
    handlers.setMaps((prev) => prev.filter((m) => !removed.has(m.id)));
  }

  if (patch.map !== undefined) {
    handlers.applyMapFromServer(patch.map as TacticalGameMap);
  }

  for (const row of patch.tokens?.upserted ?? []) {
    const tokenPatch = parseMapTokenPatch(row);
    if (!tokenPatch) {
      throw new Error('Invalid game patch: token upsert could not be parsed');
    }
    handlers.applyMapTokenFromServer(tokenPatch);
  }

  const deletedTokenIds = patch.tokens?.deletedIds ?? [];
  if (deletedTokenIds.length > 0) {
    handlers.removeMapTokens(deletedTokenIds);
  }

  if (patch.initiative !== undefined) {
    handlers.applyInitiative(patch.initiative);
  }

  if (patch.settings !== undefined) {
    handlers.applyGameSettingsPatch(patch.settings);
    if ('activeMapId' in patch.settings) {
      handlers.setActiveMapId(patch.settings.activeMapId ?? null);
    }
  }
}

export type { GamePatch };
