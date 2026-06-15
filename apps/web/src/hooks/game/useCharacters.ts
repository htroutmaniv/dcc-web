import { useCallback, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Character } from '../../types/game';
import { readCharacterAttackTargetMap } from '../../utils/character-attack-target';
import { dedupeAsync } from '../../utils/dedupe-async';

export function useCharacters(
  gameId: string | undefined,
  isDm: boolean,
  userId: string | undefined,
) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [characterAttackTargetById, setCharacterAttackTargetById] = useState<
    Record<string, string>
  >({});

  const loadCharacters = useMemo(
    () =>
      dedupeAsync(async () => {
        if (!gameId) return;
        const q = isDm ? '?includeDead=true' : '';
        const data = await api<{ characters: Character[] }>(
          `/games/${gameId}/characters${q}`,
        );
        setCharacters(data.characters);
        setCharacterAttackTargetById(readCharacterAttackTargetMap(data.characters));
        setSelectedCharacter((prev) => {
          if (!prev) return null;
          return data.characters.find((c) => c.id === prev.id) ?? null;
        });
        return data.characters;
      }),
    [gameId, isDm],
  );

  const applyCharacterFromServer = useCallback(
    (updated: Character) => {
      const isPartyDead =
        updated.status === 'dead' && updated.ownerUserId !== userId;
      if (
        !isDm &&
        updated.ownerUserId &&
        userId &&
        updated.ownerUserId !== userId &&
        !isPartyDead
      ) {
        return;
      }
      setSelectedCharacter((prev) => (prev?.id === updated.id ? updated : prev));
      setCharacters((prev) => {
        if (updated.status === 'archived') {
          return prev.filter((c) => c.id !== updated.id);
        }
        const idx = prev.findIndex((c) => c.id === updated.id);
        if (idx >= 0) {
          return prev.map((c) => (c.id === updated.id ? updated : c));
        }
        if (isPartyDead || isDm) {
          return [...prev, updated];
        }
        return prev;
      });
    },
    [isDm, userId],
  );

  return {
    characters,
    setCharacters,
    selectedCharacter,
    setSelectedCharacter,
    characterAttackTargetById,
    setCharacterAttackTargetById,
    loadCharacters,
    applyCharacterFromServer,
  };
}

export type CharactersState = ReturnType<typeof useCharacters>;
