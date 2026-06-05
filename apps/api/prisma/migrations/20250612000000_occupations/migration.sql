-- CreateEnum
CREATE TYPE "OccupationRace" AS ENUM ('elf', 'dwarf', 'halfling');

-- CreateTable
CREATE TABLE "occupations" (
    "id" UUID NOT NULL,
    "roll_low" INTEGER NOT NULL,
    "roll_high" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "race" "OccupationRace",
    "trained_weapon" TEXT NOT NULL,
    "weapon_damage" TEXT NOT NULL,
    "weapon_attack_bonus" INTEGER NOT NULL DEFAULT 0,
    "trade_goods" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "occupations_name_key" ON "occupations"("name");

-- CreateIndex
CREATE INDEX "occupations_roll_low_roll_high_idx" ON "occupations"("roll_low", "roll_high");
