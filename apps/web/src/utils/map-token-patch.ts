import type { TacticalMapToken } from '../types/map';

/** Minimal fields from API/socket token payloads for in-place map updates. */
export type MapTokenPatch = Pick<
  TacticalMapToken,
  'id' | 'mapId' | 'x' | 'y' | 'zone'
> &
  Partial<
    Pick<
      TacticalMapToken,
      | 'label'
      | 'kind'
      | 'characterId'
      | 'monsterId'
      | 'color'
      | 'hpMax'
      | 'hpCurrent'
      | 'isDead'
    >
  >;

export function parseMapTokenPatch(raw: unknown): MapTokenPatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = row.id;
  const mapId = row.mapId;
  const x = row.x;
  const y = row.y;
  const zone = row.zone;
  if (typeof id !== 'string' || typeof mapId !== 'string') return null;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  if (zone !== 'map' && zone !== 'holding') return null;

  const patch: MapTokenPatch = { id, mapId, x, y, zone };
  if (typeof row.label === 'string') patch.label = row.label;
  if (row.kind === 'pc' || row.kind === 'npc' || row.kind === 'object' || row.kind === 'monster') {
    patch.kind = row.kind;
  }
  if (typeof row.characterId === 'string' || row.characterId === null) {
    patch.characterId = row.characterId;
  }
  if (typeof row.monsterId === 'string' || row.monsterId === null) {
    patch.monsterId = row.monsterId;
  }
  if (typeof row.color === 'string') patch.color = row.color;
  if (typeof row.hpMax === 'number' || row.hpMax === null) patch.hpMax = row.hpMax;
  if (typeof row.hpCurrent === 'number' || row.hpCurrent === null) {
    patch.hpCurrent = row.hpCurrent;
  }
  if (typeof row.isDead === 'boolean') patch.isDead = row.isDead;
  return patch;
}
