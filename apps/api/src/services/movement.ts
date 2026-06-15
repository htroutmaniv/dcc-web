import {
  composeGameSettingsFromRecord,
  movementRangeFromStats,
  type CharacterStats,
  type GameSettingsRecord,
} from '@dcc-web/shared';

export function characterMovementRange(statsJson: unknown, game: GameSettingsRecord) {
  const settings = composeGameSettingsFromRecord(game);
  const stats = statsJson as CharacterStats;
  return movementRangeFromStats(stats, settings.gridFtPerCell);
}
