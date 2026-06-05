-- Multi-map support, monster tokens, grid presets

ALTER TYPE "TokenKind" ADD VALUE IF NOT EXISTS 'monster';

-- Init used CREATE UNIQUE INDEX (not a named constraint); both must be cleared for multi-map.
DROP INDEX IF EXISTS "game_maps_game_id_key";
ALTER TABLE "game_maps" DROP CONSTRAINT IF EXISTS "game_maps_game_id_key";

ALTER TABLE "game_maps" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Main map';
ALTER TABLE "game_maps" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "game_maps" ADD COLUMN IF NOT EXISTS "visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "game_maps" ADD COLUMN IF NOT EXISTS "grid_preset" TEXT NOT NULL DEFAULT 'tactical';

CREATE INDEX IF NOT EXISTS "game_maps_game_id_sort_order_idx" ON "game_maps"("game_id", "sort_order");

ALTER TABLE "map_tokens" ADD COLUMN IF NOT EXISTS "monster_id" UUID;

ALTER TABLE "map_tokens"
  ADD CONSTRAINT "map_tokens_monster_id_fkey"
  FOREIGN KEY ("monster_id") REFERENCES "game_monsters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "map_tokens_map_id_monster_id_idx" ON "map_tokens"("map_id", "monster_id");
