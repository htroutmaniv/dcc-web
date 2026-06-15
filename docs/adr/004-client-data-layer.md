# ADR-004: Client data layer

## Status

Accepted (2025-06-17) — TanStack Query deferred.

## Context

`apps/web` loads game state over REST and keeps it fresh via Socket.IO events (`useGameRealtimeSync`). Phase 4 decomposed `GamePage` into domain hooks (`useCharacters`, `useMonsters`, `useMapActions`, `useGamePageController`, etc.).

`docs/ARCHITECTURE.md` originally recommended TanStack Query + Zustand. Neither is in the dependency tree today.

## Decision

**Keep the hook-based client layer** for now:

- Each domain hook owns fetch + local `useState`, with socket handlers calling `apply*FromServer` updaters.
- `useGamePageController` orchestrates hooks and UI state (dialogs, tabs, selection).
- No global client store (Zustand) — game scope is route-bound (`/games/:id`).

**Defer TanStack Query** until pain appears:

- Duplicate fetches across remounts
- Manual cache invalidation becoming error-prone
- Need for background refetch / stale-while-revalidate

Realtime already pushes most mutations; REST is primarily initial load and optimistic POST/PATCH responses.

## Alternatives considered

1. **Adopt TanStack Query now** — rejected: large migration for modest gain while socket sync works; Phase 4.2 already deferred.
2. **Zustand for game state** — rejected: would duplicate server state; socket + hooks are sufficient at current scale.

## Consequences

- New features should follow existing hook patterns under `apps/web/src/hooks/game/`.
- **ADR-006** (`game:patch` + `applyGamePatch` reducer) is now the primary sync path; socket invalidation pings are retired.
- If adopting TanStack Query later, migrate one resource at a time (e.g. characters first) and keep `game:patch` as the cache update source.
- Plan item 4.2 remains `[-]` deferred with this ADR as the recorded reason.
