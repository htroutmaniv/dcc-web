import {
  getCharacterVitality,
  type CharacterCombatLike,
} from '../combat/combat-mortality.js';

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

function assertInitiativeEntry(entry: unknown, index: number): InitiativeEntry {
  if (entry == null || typeof entry !== 'object') {
    throw new Error(`Invalid initiative state: order[${index}] must be an object`);
  }
  const e = entry as Partial<InitiativeEntry>;
  if (typeof e.entryId !== 'string' || e.entryId.length === 0) {
    throw new Error(`Invalid initiative state: order[${index}].entryId must be a non-empty string`);
  }
  if (e.kind !== 'character' && e.kind !== 'monster' && e.kind !== 'monster_group') {
    throw new Error(`Invalid initiative state: order[${index}].kind is invalid`);
  }
  if (typeof e.name !== 'string') {
    throw new Error(`Invalid initiative state: order[${index}].name must be a string`);
  }
  if (typeof e.initiative !== 'number' || !Number.isFinite(e.initiative)) {
    throw new Error(`Invalid initiative state: order[${index}].initiative must be a number`);
  }
  return entry as InitiativeEntry;
}

function requirePositiveInt(field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
    throw new Error(`Invalid initiative state: ${field} must be a positive integer, got ${String(value)}`);
  }
  return value;
}

function requireNonNegativeInt(field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(
      `Invalid initiative state: ${field} must be a non-negative integer, got ${String(value)}`,
    );
  }
  return value;
}

/** Parse initiative JSON from `game_initiative.state`. Returns null when combat is not active. */
export function parseGameInitiativeState(init: unknown): GameInitiativeState | null {
  if (init == null) return null;
  if (typeof init !== 'object') {
    throw new Error(`Invalid initiative state: expected object, got ${typeof init}`);
  }
  const state = init as Partial<GameInitiativeState>;
  if (!state.active) return null;
  if (!Array.isArray(state.order)) {
    throw new Error('Invalid initiative state: active initiative requires order array');
  }
  const order = state.order.map((entry, index) => assertInitiativeEntry(entry, index));
  return {
    active: true,
    round: requirePositiveInt('round', state.round),
    turnIndex: requireNonNegativeInt('turnIndex', state.turnIndex),
    order,
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
