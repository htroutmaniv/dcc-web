-- Add archived status for characters removed from active game roster
ALTER TYPE "CharacterStatus" ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
