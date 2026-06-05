import type { MapDrawing } from '@dcc-web/shared';

export interface TacticalMapToken {
  id: string;
  mapId: string;
  kind: 'pc' | 'npc' | 'object' | 'monster';
  label: string;
  characterId: string | null;
  monsterId: string | null;
  x: number;
  y: number;
  zone: 'map' | 'holding';
  color: string;
  hpMax: number | null;
  hpCurrent: number | null;
  isDead?: boolean;
}

export interface TacticalGameMap {
  id: string;
  gameId: string;
  name: string;
  sortOrder: number;
  visible: boolean;
  gridPreset: string;
  imageUrl: string | null;
  widthPx: number;
  heightPx: number;
  imageScale: number;
  gridCellPx: number;
  gridFtPerCell: number;
  dmDrawings: MapDrawing[];
  tokens: TacticalMapToken[];
}
