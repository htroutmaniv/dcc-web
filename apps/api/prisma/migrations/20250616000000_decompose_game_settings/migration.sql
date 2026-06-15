-- Decompose games.settings JSON into first-class columns + game_initiative table.

CREATE TYPE "player_token_movement" AS ENUM ('free', 'approval');

ALTER TABLE "games" ADD COLUMN "active_map_id" UUID;
ALTER TABLE "games" ADD COLUMN "monsters_visible_on_map" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "games" ADD COLUMN "shared_monster_initiative" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "games" ADD COLUMN "hide_monster_ac_in_roll_log" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "games" ADD COLUMN "grid_ft_per_cell" DECIMAL(6,2) NOT NULL DEFAULT 5;
ALTER TABLE "games" ADD COLUMN "player_token_movement" "player_token_movement" NOT NULL DEFAULT 'free';

UPDATE "games"
SET
  "active_map_id" = NULLIF(settings->>'activeMapId', '')::uuid,
  "monsters_visible_on_map" = COALESCE((settings->>'monstersVisibleOnMap')::boolean, false),
  "shared_monster_initiative" = COALESCE((settings->>'sharedMonsterInitiative')::boolean, false),
  "hide_monster_ac_in_roll_log" = COALESCE((settings->>'hideMonsterAcInRollLog')::boolean, false),
  "grid_ft_per_cell" = COALESCE((settings->>'gridFtPerCell')::numeric, 5),
  "player_token_movement" = CASE
    WHEN settings->>'playerTokenMovement' = 'approval' THEN 'approval'::"player_token_movement"
    ELSE 'free'::"player_token_movement"
  END;

CREATE TABLE "game_initiative" (
  "game_id" UUID NOT NULL,
  "state" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "game_initiative_pkey" PRIMARY KEY ("game_id")
);

INSERT INTO "game_initiative" ("game_id", "state", "version", "updated_at")
SELECT
  g.id,
  g.settings->'initiative',
  1,
  NOW()
FROM "games" g
WHERE g.settings ? 'initiative'
  AND jsonb_typeof(g.settings->'initiative') = 'object'
  AND COALESCE((g.settings->'initiative'->>'active')::boolean, false) = true;

ALTER TABLE "game_initiative"
  ADD CONSTRAINT "game_initiative_game_id_fkey"
  FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "games"
  ADD CONSTRAINT "games_active_map_id_fkey"
  FOREIGN KEY ("active_map_id") REFERENCES "game_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "games" DROP COLUMN "settings";
