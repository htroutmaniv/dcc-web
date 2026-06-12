import {
  getCharacterVitality,
  type CharacterCombatLike,
} from './combat-mortality.js';

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

export type InitiativeCharacterSnapshot = {
  id: string;
  level: number;
  status: string;
  combat?: CharacterCombatLike | null;
};

export function isCharacterInitiativeInactive(
  character: InitiativeCharacterSnapshot,
): boolean {
  if (character.status === 'dead') return true;
  return getCharacterVitality(character) === 'dead';
}

export function createCharacterInitiativeSkipFn(
  characters: InitiativeCharacterSnapshot[],
): (entry: InitiativeEntry) => boolean {
  const byId = new Map(characters.map((c) => [c.id, c]));
  return (entry) => {
    if (entry.kind !== 'character' || !entry.characterId) return false;
    const character = byId.get(entry.characterId);
    if (!character) return false;
    return isCharacterInitiativeInactive(character);
  };
}

export function getCurrentTurnEntry(
  state: GameInitiativeState | null,
  shouldSkip?: (entry: InitiativeEntry) => boolean,
): InitiativeEntry | null {
  if (!state?.active || state.order.length === 0) return null;
  if (!shouldSkip) {
    const idx = state.turnIndex % state.order.length;
    return state.order[idx] ?? null;
  }
  const len = state.order.length;
  for (let offset = 0; offset < len; offset += 1) {
    const idx = (state.turnIndex + offset) % len;
    const entry = state.order[idx];
    if (entry && !shouldSkip(entry)) return entry;
  }
  return null;
}

export function isCharacterTurn(
  state: GameInitiativeState | null,
  characterId: string,
  shouldSkip?: (entry: InitiativeEntry) => boolean,
): boolean {
  const current = getCurrentTurnEntry(state, shouldSkip);
  return current?.kind === 'character' && current.characterId === characterId;
}

export function isCharacterInInitiative(
  state: GameInitiativeState | null,
  characterId: string,
): boolean {
  if (!state?.active) return false;
  return state.order.some(
    (entry) => entry.kind === 'character' && entry.characterId === characterId,
  );
}

export function shouldShowInitiativeQuickRoll(
  state: GameInitiativeState | null,
  characterId: string,
): boolean {
  if (!state?.active) return true;
  return !isCharacterInInitiative(state, characterId);
}

export function advanceInitiativeTurn(
  state: GameInitiativeState,
  shouldSkip?: (entry: InitiativeEntry) => boolean,
): GameInitiativeState {
  if (state.order.length === 0) return state;
  const len = state.order.length;
  let turnIndex = state.turnIndex + 1;
  let round = state.round;
  if (turnIndex >= len) {
    turnIndex = 0;
    round += 1;
  }
  if (!shouldSkip) {
    return { ...state, turnIndex, round };
  }
  let steps = 0;
  while (steps < len && shouldSkip(state.order[turnIndex]!)) {
    turnIndex += 1;
    if (turnIndex >= len) {
      turnIndex = 0;
      round += 1;
    }
    steps += 1;
  }
  return { ...state, turnIndex, round };
}

/** When the stored turn index points at a killed PC, advance to the next active entry. */
export function normalizeInitiativeTurnIndex(
  state: GameInitiativeState,
  shouldSkip: (entry: InitiativeEntry) => boolean,
): GameInitiativeState {
  if (state.order.length === 0) return state;
  const len = state.order.length;
  let { turnIndex, round } = state;
  let steps = 0;
  while (steps < len && shouldSkip(state.order[turnIndex]!)) {
    turnIndex += 1;
    if (turnIndex >= len) {
      turnIndex = 0;
      round += 1;
    }
    steps += 1;
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
