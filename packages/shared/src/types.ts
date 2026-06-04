export type CharacterStatus = 'alive' | 'dead' | 'archived';
export type CharacterSource = 'manual' | 'random' | 'purple_sorcerer' | 'import';
export type ItemCategory = 'weapon' | 'armor' | 'treasure' | 'misc' | 'disposable';
export type TokenKind = 'pc' | 'npc' | 'object';
export type TokenZone = 'map' | 'holding';
export type PlayerTokenMovement = 'free' | 'approval';
export type MovementRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface GameSettings {
  gridFtPerCell: number;
  playerTokenMovement: PlayerTokenMovement;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  gridFtPerCell: 5,
  playerTokenMovement: 'free',
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
