export interface User {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

import type { GameInitiativeState, GameSettings } from '@dcc-web/shared';

export interface Game {
  id: string;
  title: string;
  inviteCode: string;
  dmUserId: string;
  status?: string;
  settings?: GameSettings;
}

export type { GameInitiativeState };

export interface CharacterAbility {
  score: number;
  modifier: number;
}

export interface CharacterStats {
  abilities?: Record<string, CharacterAbility>;
  saves?: Record<string, number>;
  speed?: number;
  initiative?: number;
  custom?: Record<string, unknown>;
}

export interface CharacterCombat {
  ac?: number;
  hpMax?: number;
  hpCurrent?: number;
  hpTemp?: number;
}

export interface CharacterItem {
  id: string;
  category: string;
  name: string;
  quantity: number;
  notes?: string;
  properties?: Record<string, unknown>;
}

export interface Character {
  id: string;
  ownerUserId?: string;
  name: string;
  className: string;
  level: number;
  status: string;
  alignment?: string;
  notes?: string;
  stats?: CharacterStats;
  combat?: CharacterCombat;
  items?: CharacterItem[];
}

export interface DiceResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
}

export interface GameDetail {
  game: Game & {
    map?: { id: string; gridFtPerCell?: number } | null;
    players?: { user: User }[];
  };
  isDm: boolean;
}
