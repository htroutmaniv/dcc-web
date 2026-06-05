-- Init migration created UNIQUE INDEX game_maps_game_id_key; tactical_maps only dropped a constraint.
DROP INDEX IF EXISTS "game_maps_game_id_key";
