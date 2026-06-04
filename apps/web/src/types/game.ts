export interface User {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface Game {
  id: string;
  title: string;
  inviteCode: string;
  dmUserId: string;
  status?: string;
}

export interface Character {
  id: string;
  name: string;
  className: string;
  level: number;
  status: string;
  combat: { hpCurrent?: number; hpMax?: number; ac?: number };
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
