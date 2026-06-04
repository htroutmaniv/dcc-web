import {
  movementRangeFromStats,
  parseGameSettings,
  type CharacterStats,
} from '@dcc-web/shared';
import type { Game } from '@prisma/client';

export function characterMovementRange(
  statsJson: unknown,
  game: Pick<Game, 'settings'>,
) {
  const settings = parseGameSettings(game.settings);
  const stats = statsJson as CharacterStats;
  return movementRangeFromStats(stats, settings.gridFtPerCell);
}
