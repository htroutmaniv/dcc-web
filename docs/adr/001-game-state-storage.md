# ADR-001: Game state storage

## Status

Accepted (2025-06-17) — reflects Phase 2 implementation.

## Context

Game state spans stable relational data (membership, map tokens, item rows) and flexible blobs (character stats, monster sheets, initiative order). Early designs used a monolithic `Game.settings` JSON column, which caused read-modify-write races and weak typing.

## Decision

Use a **hybrid relational + JSON** model:

| Domain | Storage | Concurrency |
|--------|---------|-------------|
| Game flags (`monstersVisibleOnMap`, `playerTokenMovement`, etc.) | Typed columns on `games` | Row-level updates |
| Initiative | `game_initiative` table: `state Json`, `version Int` | Optimistic locking via `mutateInitiative` / `withOptimisticRetry` |
| Characters | Relational columns + `stats` / `combat` JSON | `version` increment on patch |
| Monsters | Relational combat columns + `sheet` / `stats` / `combat` JSON | Last-write-wins on patch |
| Maps & tokens | `game_maps`, `map_tokens` tables | Transactions for sync batches |
| Dice rolls | Append-only `dice_rolls` | N/A |

**Do not** return to a single JSON settings blob. Compose `game.settings` at read time via `serializeGameForClient` for API compatibility.

JSON columns hold DCC-specific extensibility (Purple Sorcerer import, custom stats keys). Zod schemas in `packages/shared` validate known keys with `.passthrough()` during migration to stricter shapes.

## Alternatives considered

1. **Fully normalized sheets** — rejected: excessive migration churn for import/export and rapid sheet evolution.
2. **Document store only** — rejected: membership, tokens, and audit need relational integrity.

## Consequences

- Initiative conflicts retry transparently; concurrent advances serialize correctly.
- Game settings are queryable and indexable without JSON operators.
- Contributors must choose the right layer: column vs JSON vs dedicated table when adding state.
