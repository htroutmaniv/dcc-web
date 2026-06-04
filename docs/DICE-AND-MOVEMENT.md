# Server-authoritative dice & map movement

## Dice rolls

All randomness for play happens on the **API**. Clients send intent; server rolls with `crypto`-quality RNG (or seeded audit log per roll), persists, broadcasts.

### Request shape

```json
{
  "gameId": "uuid",
  "characterId": "uuid optional",
  "notation": "1d20+3",
  "reason": "Attack roll"
}
```

### Server steps

1. Authenticate user; verify game membership.
2. Parse notation (MVP: `NdM`, `NdM+K`, `NdM-K`).
3. Roll each die; compute total.
4. Insert `dice_rolls` row (user, game, character, notation, breakdown, total).
5. Emit `dice:rolled` to `game:{gameId}` room.
6. Return result to caller.

Players cannot supply pre-rolled values. Replays use stored `dice_rolls` only.

### Random character generation

`POST /games/:gameId/characters/generate` — server runs DCC-ish rollers (abilities, class, etc.), creates `characters` row with `source = random`, assigns to authenticated player (or DM picks target player in body).

## Map movement

### Grid

- Default **5 feet per cell** (`games.settings.gridFtPerCell` or `game_maps.grid_ft_per_cell`).
- Movement **radius in feet** = effective speed after modifiers.

### Effective movement (server calculates)

```
effectiveFt = baseSpeed
  + sum(statModifiers.movementFt)   // DM edits, spells in stats json
  - armorSpeedPenalty               // from equipped armor / stats
```

Expose `GET /characters/:id/movement-range` → `{ feet, cells, gridFtPerCell }` where `cells = feet / gridFtPerCell`.

Client draws a **circle** (simple radius) centered on token; DM sees all; player sees own when moving.

### Player token moves

| `settings.playerTokenMovement` | Behavior |
|-------------------------------|----------|
| `free` | Player PATCH token position; server validates distance ≤ effectiveFt; broadcast |
| `approval` | Player creates `movement_requests` pending; DM `accept` / `reject`; on accept, token updates |

DM always moves any token without approval.

### Holding area & map reset

- Tokens have `zone`: `holding` | `map`.
- **Reset tokens to holding**: `POST /games/:gameId/map/reset-tokens` — all PC tokens → holding coordinates (sidebar strip), keep `character_id` links.
- **Clear map**: `POST /games/:gameId/map/clear` — remove image/drawings optional flag; tokens to holding; does not delete characters.

DM can edit **any** character stat via `PATCH /characters/:id` (DM role); changes recompute movement server-side.

## Dead characters

`characters.status`: `alive` | `dead`. Dead sheets remain queryable (`?status=dead` filter); excluded from active play lists by default. DM can mark dead/revive.
