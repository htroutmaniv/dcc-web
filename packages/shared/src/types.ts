export type CharacterStatus = 'alive' | 'dead' | 'archived';
export type CharacterSource = 'manual' | 'random' | 'purple_sorcerer' | 'import';
export type ItemCategory = 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable';
export type TokenKind = 'pc' | 'npc' | 'object' | 'monster';
export type TokenZone = 'map' | 'holding';
export type PlayerTokenMovement = 'free' | 'approval';
export type MovementRequestStatus = 'pending' | 'accepted' | 'rejected';

import type { GameInitiativeState } from './initiative/initiative.js';

export interface GameSettings {
  gridFtPerCell: number;
  playerTokenMovement: PlayerTokenMovement;
  initiative: GameInitiativeState | null;
  activeMapId: string | null;
  /** When true, living monster tokens are visible to players outside of initiative. */
  monstersVisibleOnMap: boolean;
  /** When true, in-play monsters share one initiative slot during combat. */
  sharedMonsterInitiative: boolean;
  /** When true, players do not see monster AC in the roll log (DM still sees it). */
  hideMonsterAcInRollLog: boolean;
}

/** Prisma column defaults / new-game seed values — not a runtime fallback. */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  gridFtPerCell: 5,
  playerTokenMovement: 'free',
  initiative: null,
  activeMapId: null,
  monstersVisibleOnMap: false,
  sharedMonsterInitiative: false,
  hideMonsterAcInRollLog: false,
};

export interface AbilityScore {
  score: number;
  modifier: number;
}

export interface CharacterStats {
  abilities: Record<string, AbilityScore>;
  saves?: Record<string, number>;
  speed: number;
  armorSpeedPenalty?: number;
  movementModifiers?: { label: string; feet: number }[];
  initiative?: number;
  custom?: Record<string, unknown>;
}

export interface CharacterCombat {
  ac: number;
  hpMax: number;
  hpCurrent: number;
  hpTemp?: number;
}

export interface DiceRollResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
}

export interface MovementRange {
  feet: number;
  cells: number;
  gridFtPerCell: number;
}
