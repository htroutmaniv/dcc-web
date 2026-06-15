import { useEffect, useState } from 'react';
import { emptyDiceTray, type DiceTrayCounts } from '@dcc-web/shared';
import type { CharacterRollKind } from '../../utils/character-rolls';

export function useDiceTray(characters: { id: string }[], selectedCharacterId?: string) {
  const [diceTrayCounts, setDiceTrayCounts] = useState<DiceTrayCounts>(emptyDiceTray);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceCharacterId, setDiceCharacterId] = useState<string | null>(null);
  const [diceQuickRollKind, setDiceQuickRollKind] = useState<CharacterRollKind | null>(null);

  useEffect(() => {
    if (characters.length === 0) {
      setDiceCharacterId(null);
      return;
    }
    setDiceCharacterId((prev) =>
      prev && characters.some((c) => c.id === prev) ? prev : characters[0]!.id,
    );
  }, [characters]);

  useEffect(() => {
    if (selectedCharacterId) {
      setDiceCharacterId(selectedCharacterId);
    }
  }, [selectedCharacterId]);

  const resetDiceTray = () => {
    setDiceTrayCounts(emptyDiceTray());
  };

  return {
    diceTrayCounts,
    setDiceTrayCounts,
    diceRolling,
    setDiceRolling,
    diceCharacterId,
    setDiceCharacterId,
    diceQuickRollKind,
    setDiceQuickRollKind,
    resetDiceTray,
  };
}

export type DiceTrayState = ReturnType<typeof useDiceTray>;
