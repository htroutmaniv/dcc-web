ALTER TABLE "dice_rolls" ADD COLUMN "roll_kind" TEXT NOT NULL DEFAULT 'unspecified';

ALTER TABLE "map_tokens" ADD COLUMN "hp_max" INTEGER;
ALTER TABLE "map_tokens" ADD COLUMN "hp_current" INTEGER;
