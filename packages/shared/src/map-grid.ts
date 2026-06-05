/** Grid scale presets for tactical / town / regional maps. */

export type MapGridPreset = 'tactical' | 'town' | 'regional';

export interface MapGridPresetConfig {
  id: MapGridPreset;
  label: string;
  gridFtPerCell: number;
  gridCellPx: number;
  /** Size multiplier applied to the aspect-matched town-minimum grid. */
  sizeMultiplier: number;
}

/** Minimum grid footprint (town scale) before preset multiplier. */
export const MAP_GRID_MIN_COLS = 40;
export const MAP_GRID_MIN_ROWS = 30;

export const MAP_GRID_PRESETS: Record<MapGridPreset, MapGridPresetConfig> = {
  tactical: {
    id: 'tactical',
    label: "Tactical (5' squares)",
    gridFtPerCell: 5,
    gridCellPx: 50,
    sizeMultiplier: 1,
  },
  town: {
    id: 'town',
    label: "Town (100' squares)",
    gridFtPerCell: 100,
    gridCellPx: 50,
    sizeMultiplier: 1.5,
  },
  regional: {
    id: 'regional',
    label: 'Regional (1 mile squares)',
    gridFtPerCell: 5280,
    gridCellPx: 50,
    sizeMultiplier: 2.25,
  },
};

export function resolveMapGridPreset(preset: string | undefined | null): MapGridPresetConfig {
  if (preset && preset in MAP_GRID_PRESETS) {
    return MAP_GRID_PRESETS[preset as MapGridPreset];
  }
  return MAP_GRID_PRESETS.tactical;
}
