# ADR-006: Realtime state delivery via GamePatch

## Status

Accepted (2026-06-15)

## Context

Prior to Phases B–C, the client kept game state fresh by refetching full lists on Socket.IO invalidation pings (`map:updated`, `monsters:changed`, etc.). That caused request storms, ignored useful deltas (e.g. moved tokens), and duplicated work between the mutation initiator and peer clients.

## Decision

**Split command delivery from state delivery:**

| Channel | Role |
|---------|------|
| **HTTP mutation** | Authoritative command; response includes `{ patch: GamePatch }` for the initiator |
| **WebSocket `game:patch`** | Same `GamePatch` broadcast to other room members |
| **Full REST reload** | Initial page load and reconnect resync only (`resyncAll`) |

### GamePatch shape

Defined in `packages/shared/src/game-patch.ts`. Carries optional deltas:

- `characters` — upserted rows / deleted IDs
- `monsters` — upserted rows / deleted IDs
- `map` — full active-map snapshot (tokens included)
- `maps` — deleted map IDs (list slice)
- `tokens` — upserted token rows / deleted IDs
- `initiative` — initiative state or `null`
- `settings` — partial game settings (including `activeMapId`)

Patches are validated on the client via `validateGamePatch`; invalid payloads trigger a single `resyncAll()` — never silent partial merge.

### Actor short-circuit

The initiator applies the HTTP response patch locally. Socket handlers skip when `actorUserId === userId` to avoid double-apply.

### Legacy events

`damage:applied`, `dice:rolled`, and movement approval events remain for animation/log UX. State changes previously carried by `map:updated`, `monsters:changed`, and duplicate `character:upsert` / `initiative:updated` pairs are retired in favor of `game:patch`.

### Server patch builders

`apps/api/src/services/game-state.ts` exposes `buildGamePatch` helpers so HTTP responses and socket publish share one composition path (Phase D.3).

## Consequences

- Clients must implement one reducer: `applyGamePatch` → domain `apply*FromServer` functions.
- New mutations must return and publish the same patch; do not add empty invalidation pings.
- Player visibility rules still apply — patches must not leak DM-only entities (filter server-side as list endpoints do today).
- Reconnect remains the authoritative catch-up path for missed events.

## Related

- ADR-004 (client data layer — hook + patch model sufficient; TanStack Query still deferred)
- ADR-003 (single-instance Socket.IO; multi-instance needs Redis fan-out)
