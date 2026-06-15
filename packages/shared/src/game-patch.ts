import type { GameInitiativeState } from './initiative/initiative.js';
import type { GameSettings } from './types.js';

/** Delta bundle returned from mutations and sent on `game:patch` socket events. */
export type GamePatch = {
  characters?: {
    upserted?: unknown[];
    deletedIds?: string[];
  };
  monsters?: {
    upserted?: unknown[];
    deletedIds?: string[];
  };
  /** Full active-map snapshot after token sync. */
  map?: unknown;
  /** Map list deltas (e.g. after delete). */
  maps?: {
    deletedIds?: string[];
  };
  tokens?: {
    upserted?: unknown[];
    deletedIds?: string[];
  };
  initiative?: GameInitiativeState | null;
  settings?: Partial<GameSettings>;
};

function isStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid game patch: ${label} must be an array`);
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(`Invalid game patch: ${label} must contain only strings`);
    }
  }
  return value;
}

function isObjectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid game patch: ${label} must be an array`);
  }
  return value;
}

/** True when the patch carries no apply-able fields. */
export function isEmptyGamePatch(patch: GamePatch): boolean {
  if (patch.map !== undefined) return false;
  if (patch.initiative !== undefined) return false;
  if (patch.settings !== undefined && Object.keys(patch.settings).length > 0) return false;

  const chars = patch.characters;
  if (chars?.upserted?.length || chars?.deletedIds?.length) return false;

  const monsters = patch.monsters;
  if (monsters?.upserted?.length || monsters?.deletedIds?.length) return false;

  const tokens = patch.tokens;
  if (tokens?.upserted?.length || tokens?.deletedIds?.length) return false;

  const maps = patch.maps;
  if (maps?.deletedIds?.length) return false;

  return true;
}

/** Fail fast on malformed patches — never silently merge partial data. */
export function validateGamePatch(raw: unknown): GamePatch {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid game patch: expected an object');
  }

  const patch = raw as Record<string, unknown>;
  const out: GamePatch = {};

  if (patch.characters !== undefined) {
    if (!patch.characters || typeof patch.characters !== 'object' || Array.isArray(patch.characters)) {
      throw new Error('Invalid game patch: characters must be an object');
    }
    const block = patch.characters as Record<string, unknown>;
    const characters: NonNullable<GamePatch['characters']> = {};
    if (block.upserted !== undefined) {
      characters.upserted = isObjectArray(block.upserted, 'characters.upserted');
    }
    if (block.deletedIds !== undefined) {
      characters.deletedIds = isStringArray(block.deletedIds, 'characters.deletedIds');
    }
    out.characters = characters;
  }

  if (patch.monsters !== undefined) {
    if (!patch.monsters || typeof patch.monsters !== 'object' || Array.isArray(patch.monsters)) {
      throw new Error('Invalid game patch: monsters must be an object');
    }
    const block = patch.monsters as Record<string, unknown>;
    const monsters: NonNullable<GamePatch['monsters']> = {};
    if (block.upserted !== undefined) {
      monsters.upserted = isObjectArray(block.upserted, 'monsters.upserted');
    }
    if (block.deletedIds !== undefined) {
      monsters.deletedIds = isStringArray(block.deletedIds, 'monsters.deletedIds');
    }
    out.monsters = monsters;
  }

  if (patch.tokens !== undefined) {
    if (!patch.tokens || typeof patch.tokens !== 'object' || Array.isArray(patch.tokens)) {
      throw new Error('Invalid game patch: tokens must be an object');
    }
    const block = patch.tokens as Record<string, unknown>;
    const tokens: NonNullable<GamePatch['tokens']> = {};
    if (block.upserted !== undefined) {
      tokens.upserted = isObjectArray(block.upserted, 'tokens.upserted');
    }
    if (block.deletedIds !== undefined) {
      tokens.deletedIds = isStringArray(block.deletedIds, 'tokens.deletedIds');
    }
    out.tokens = tokens;
  }

  if (patch.maps !== undefined) {
    if (!patch.maps || typeof patch.maps !== 'object' || Array.isArray(patch.maps)) {
      throw new Error('Invalid game patch: maps must be an object');
    }
    const block = patch.maps as Record<string, unknown>;
    const maps: NonNullable<GamePatch['maps']> = {};
    if (block.deletedIds !== undefined) {
      maps.deletedIds = isStringArray(block.deletedIds, 'maps.deletedIds');
    }
    out.maps = maps;
  }

  if (patch.map !== undefined) {
    if (!patch.map || typeof patch.map !== 'object' || Array.isArray(patch.map)) {
      throw new Error('Invalid game patch: map must be an object');
    }
    out.map = patch.map;
  }

  if (patch.initiative !== undefined) {
    if (patch.initiative !== null && (typeof patch.initiative !== 'object' || Array.isArray(patch.initiative))) {
      throw new Error('Invalid game patch: initiative must be an object or null');
    }
    out.initiative = patch.initiative as GameInitiativeState | null;
  }

  if (patch.settings !== undefined) {
    if (!patch.settings || typeof patch.settings !== 'object' || Array.isArray(patch.settings)) {
      throw new Error('Invalid game patch: settings must be an object');
    }
    out.settings = patch.settings as Partial<GameSettings>;
  }

  if (isEmptyGamePatch(out)) {
    throw new Error('Invalid game patch: patch is empty');
  }

  return out;
}
