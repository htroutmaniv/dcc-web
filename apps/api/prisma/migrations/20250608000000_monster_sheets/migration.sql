-- Loot pools, monster sheets, monster items
CREATE TABLE "loot_pools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "entries" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loot_pools_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loot_pools_name_key" ON "loot_pools"("name");

ALTER TABLE "monster_catalog" ADD COLUMN "sheet" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "monster_catalog" ADD COLUMN "stats" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "monster_catalog" ADD COLUMN "combat" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "monster_catalog" ADD COLUMN "loot_pool_id" UUID;
ALTER TABLE "monster_catalog" ADD CONSTRAINT "monster_catalog_loot_pool_id_fkey"
  FOREIGN KEY ("loot_pool_id") REFERENCES "loot_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "game_monsters" ADD COLUMN "sheet" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "game_monsters" ADD COLUMN "stats" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "game_monsters" ADD COLUMN "combat" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "monster_items" (
    "id" UUID NOT NULL,
    "monster_id" UUID NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "monster_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "monster_items_monster_id_sort_order_idx" ON "monster_items"("monster_id", "sort_order");
ALTER TABLE "monster_items" ADD CONSTRAINT "monster_items_monster_id_fkey"
  FOREIGN KEY ("monster_id") REFERENCES "game_monsters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
