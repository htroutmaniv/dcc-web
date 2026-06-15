-- Map token and movement request coordinates as double precision (Prisma Float).
ALTER TABLE "map_tokens"
  ALTER COLUMN "x" TYPE DOUBLE PRECISION USING "x"::double precision,
  ALTER COLUMN "y" TYPE DOUBLE PRECISION USING "y"::double precision;

ALTER TABLE "movement_requests"
  ALTER COLUMN "target_x" TYPE DOUBLE PRECISION USING "target_x"::double precision,
  ALTER COLUMN "target_y" TYPE DOUBLE PRECISION USING "target_y"::double precision;
