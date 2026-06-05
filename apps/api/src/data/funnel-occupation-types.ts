export type FunnelRace = 'elf' | 'dwarf' | 'halfling';

export interface FunnelOccupation {
  /** Inclusive d100 range on the funnel occupation table (core rulebook). */
  rollLow: number;
  rollHigh: number;
  name: string;
  race?: FunnelRace;
  weapon: { name: string; damage: string; attackBonus?: number };
  goods: { name: string; notes?: string }[];
}
