-- CreateEnum
CREATE TYPE "CharacterNameKind" AS ENUM ('first', 'last');

-- CreateTable
CREATE TABLE "character_names" (
    "id" UUID NOT NULL,
    "kind" "CharacterNameKind" NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "character_names_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_names_kind_idx" ON "character_names"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "character_names_kind_name_key" ON "character_names"("kind", "name");
