/** Stored on character.stats.custom — character is eligible for initiative / in play. */
export const ACTIVE_IN_PLAY_KEY = 'activeInPlay';

export type InitiativeEntryKind = 'character' | 'monster' | 'monster_group';

export interface InitiativeEntry {
  entryId: string;
  kind: InitiativeEntryKind;
  /** Set when kind is character. */
  characterId?: string;
  /** @deprecated Per-monster initiative; use monster_group. */
  monsterId?: string;
  name: string;
  initiative: number;
  d20Roll?: number;
  modifier?: number;
}

export interface GameInitiativeState {
  active: boolean;
  round: number;
  turnIndex: number;
  order: InitiativeEntry[];
}

export function isActiveInPlay(character: {
  status: string;
  stats?: { custom?: Record<string, unknown> };
}): boolean {
  if (character.status === 'dead' || character.status === 'archived') return false;
  const custom = character.stats?.custom;
  if (custom && ACTIVE_IN_PLAY_KEY in custom) {
    return Boolean(custom[ACTIVE_IN_PLAY_KEY]);
  }
  return true;
}

export function parseGameInitiative(settings: unknown): GameInitiativeState | null {
  if (!settings || typeof settings !== 'object') return null;
  const init = (settings as { initiative?: unknown }).initiative;
  if (!init || typeof init !== 'object') return null;
  const state = init as Partial<GameInitiativeState>;
  if (!state.active || !Array.isArray(state.order)) return null;
  return {
    active: true,
    round: Math.max(1, Number(state.round) || 1),
    turnIndex: Math.max(0, Number(state.turnIndex) || 0),
    order: state.order.filter(
      (e): e is InitiativeEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as InitiativeEntry).entryId === 'string' &&
        typeof (e as InitiativeEntry).name === 'string' &&
        typeof (e as InitiativeEntry).initiative === 'number',
    ),
  };
}

export function getCurrentTurnEntry(
  state: GameInitiativeState | null,
): InitiativeEntry | null {
  if (!state?.active || state.order.length === 0) return null;
  const idx = state.turnIndex % state.order.length;
  return state.order[idx] ?? null;
}

export function isCharacterTurn(
  state: GameInitiativeState | null,
  characterId: string,
): boolean {
  const current = getCurrentTurnEntry(state);
  return current?.kind === 'character' && current.characterId === characterId;
}

export function advanceInitiativeTurn(
  state: GameInitiativeState,
): GameInitiativeState {
  if (state.order.length === 0) return state;
  let turnIndex = state.turnIndex + 1;
  let round = state.round;
  if (turnIndex >= state.order.length) {
    turnIndex = 0;
    round += 1;
  }
  return { ...state, turnIndex, round };
}

export function sortInitiativeEntries(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    const modDiff = (b.modifier ?? 0) - (a.modifier ?? 0);
    if (modDiff !== 0) return modDiff;
    return a.name.localeCompare(b.name);
  });
}
