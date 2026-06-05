-- Monster manual catalog + per-game monster instances
CREATE TABLE "monster_catalog" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "base_level" INTEGER NOT NULL DEFAULT 1,
    "hit_dice" TEXT NOT NULL DEFAULT '1d8',
    "ac" INTEGER NOT NULL DEFAULT 12,
    "attack_bonus" INTEGER NOT NULL DEFAULT 0,
    "damage" TEXT NOT NULL DEFAULT '1d6',
    "init_mod" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 30,
    "hp_avg" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monster_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "monster_catalog_name_key" ON "monster_catalog"("name");

CREATE TABLE "game_monsters" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "catalog_id" UUID,
    "name" TEXT NOT NULL,
    "scale_level" INTEGER NOT NULL DEFAULT 1,
    "hit_dice" TEXT NOT NULL DEFAULT '1d8',
    "ac" INTEGER NOT NULL DEFAULT 12,
    "attack_bonus" INTEGER NOT NULL DEFAULT 0,
    "damage" TEXT NOT NULL DEFAULT '1d6',
    "init_mod" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 30,
    "hp_max" INTEGER NOT NULL,
    "hp_current" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_monsters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "game_monsters_game_id_sort_order_idx" ON "game_monsters"("game_id", "sort_order");

ALTER TABLE "game_monsters" ADD CONSTRAINT "game_monsters_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_monsters" ADD CONSTRAINT "game_monsters_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "monster_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
