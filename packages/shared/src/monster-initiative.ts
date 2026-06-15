import {
  getCurrentTurnEntry,
  type GameInitiativeState,
  type InitiativeEntry,
} from './initiative.js';

/** Single initiative slot shared by all monsters in a game. */
export const MONSTER_GROUP_ENTRY_PREFIX = 'monster-group:';

export function monsterGroupEntryId(gameId: string): string {
  return `${MONSTER_GROUP_ENTRY_PREFIX}${gameId}`;
}

export function isMonsterGroupEntry(entry: InitiativeEntry): boolean {
  return entry.entryId.startsWith(MONSTER_GROUP_ENTRY_PREFIX);
}

export function isMonsterGroupTurn(
  state: GameInitiativeState | null,
  gameId: string,
): boolean {
  if (!state?.active) return false;
  const idx = state.turnIndex % state.order.length;
  const current = state.order[idx];
  return current != null && current.entryId === monsterGroupEntryId(gameId);
}

export function monsterGroupLabel(count: number): string {
  return count === 1 ? 'Monsters (1)' : `Monsters (${count})`;
}

/** Whether a living monster map token is on the current initiative turn. */
export function isMonsterTokenTurn(
  state: GameInitiativeState | null,
  monsterId: string,
  gameId: string,
  shouldSkip?: (entry: InitiativeEntry) => boolean,
): boolean {
  const current = getCurrentTurnEntry(state, shouldSkip);
  if (!current) return false;
  if (current.kind === 'monster') {
    return current.monsterId === monsterId;
  }
  if (current.kind === 'monster_group' || isMonsterGroupEntry(current)) {
    return current.entryId === monsterGroupEntryId(gameId);
  }
  return false;
}
