-- CreateSchema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('active', 'archived');
CREATE TYPE "GamePlayerRole" AS ENUM ('player', 'co_dm');
CREATE TYPE "CharacterStatus" AS ENUM ('alive', 'dead');
CREATE TYPE "CharacterSource" AS ENUM ('manual', 'random', 'purple_sorcerer', 'import');
CREATE TYPE "ItemCategory" AS ENUM ('weapon', 'armor', 'treasure', 'misc', 'disposable');
CREATE TYPE "TokenKind" AS ENUM ('pc', 'npc', 'object');
CREATE TYPE "TokenZone" AS ENUM ('map', 'holding');
CREATE TYPE "MovementRequestStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "discord_id" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "games" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dm_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL DEFAULT '{"gridFtPerCell":5,"playerTokenMovement":"free"}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_players" (
    "game_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "GamePlayerRole" NOT NULL DEFAULT 'player',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_players_pkey" PRIMARY KEY ("game_id","user_id")
);

CREATE TABLE "characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "game_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "class_name" TEXT NOT NULL DEFAULT '',
    "alignment" TEXT NOT NULL DEFAULT '',
    "status" "CharacterStatus" NOT NULL DEFAULT 'alive',
    "died_at" TIMESTAMP(3),
    "portrait_url" TEXT,
    "stats" JSONB NOT NULL,
    "combat" JSONB NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "source" "CharacterSource" NOT NULL DEFAULT 'manual',
    "source_payload" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "character_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "character_id" UUID NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weight" DECIMAL(10,2),
    "properties" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "character_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_maps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "game_id" UUID NOT NULL,
    "image_url" TEXT,
    "width_px" INTEGER NOT NULL DEFAULT 0,
    "height_px" INTEGER NOT NULL DEFAULT 0,
    "grid_cell_px" INTEGER NOT NULL DEFAULT 50,
    "grid_ft_per_cell" DECIMAL(6,2) NOT NULL DEFAULT 5,
    "dm_drawings" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "game_maps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "map_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "map_id" UUID NOT NULL,
    "kind" "TokenKind" NOT NULL,
    "character_id" UUID,
    "label" TEXT NOT NULL,
    "x" DECIMAL(12,4) NOT NULL,
    "y" DECIMAL(12,4) NOT NULL,
    "zone" "TokenZone" NOT NULL DEFAULT 'holding',
    "color" TEXT NOT NULL DEFAULT '#c9a227',
    "icon_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "map_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dice_rolls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "game_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "character_id" UUID,
    "notation" TEXT NOT NULL,
    "rolls" JSONB NOT NULL,
    "modifier" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dice_rolls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movement_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "game_id" UUID NOT NULL,
    "token_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "target_x" DECIMAL(12,4) NOT NULL,
    "target_y" DECIMAL(12,4) NOT NULL,
    "target_zone" "TokenZone" NOT NULL,
    "status" "MovementRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "movement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_discord_id_key" ON "users"("discord_id");
CREATE UNIQUE INDEX "games_invite_code_key" ON "games"("invite_code");
CREATE INDEX "games_dm_user_id_status_idx" ON "games"("dm_user_id", "status");
CREATE INDEX "game_players_user_id_idx" ON "game_players"("user_id");
CREATE INDEX "characters_game_id_owner_user_id_idx" ON "characters"("game_id", "owner_user_id");
CREATE INDEX "characters_game_id_status_idx" ON "characters"("game_id", "status");
CREATE INDEX "character_items_character_id_category_idx" ON "character_items"("character_id", "category");
CREATE UNIQUE INDEX "game_maps_game_id_key" ON "game_maps"("game_id");
CREATE INDEX "map_tokens_map_id_zone_idx" ON "map_tokens"("map_id", "zone");
CREATE INDEX "dice_rolls_game_id_created_at_idx" ON "dice_rolls"("game_id", "created_at");
CREATE INDEX "movement_requests_game_id_status_idx" ON "movement_requests"("game_id", "status");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_dm_user_id_fkey" FOREIGN KEY ("dm_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "characters" ADD CONSTRAINT "characters_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "character_items" ADD CONSTRAINT "character_items_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_maps" ADD CONSTRAINT "game_maps_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "map_tokens" ADD CONSTRAINT "map_tokens_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "game_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "map_tokens" ADD CONSTRAINT "map_tokens_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movement_requests" ADD CONSTRAINT "movement_requests_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movement_requests" ADD CONSTRAINT "movement_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
