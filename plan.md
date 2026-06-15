# DCC Web — Realtime & Client Data-Layer Plan

Plan to shift the app from **client-driven refetch** to **server-authoritative state delivery**: the server owns the database and computes new state on every mutation, then pushes that state to clients over WebSocket. Clients apply patches instead of re-pulling full snapshots.

> The prior **Architectural Remediation Plan** (Phases 0–6) is complete and lives in git history. This document superseded it as the active roadmap.

**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[-]` cancelled / deferred

**Effort:** S ≤ 1 day · M = 2–4 days · L = 1+ week

> **Progress (2026-06-15): Phases A–F complete.** Realtime delivery uses `GamePatch` on HTTP + `game:patch` WebSocket. Full-list fetch counter in DM panel. Deferred: D.1 benchmark, D.4 cache, integration/e2e tests.

---

## The problem (why this plan existed)

Historically the server emitted **invalidation pings**, not **state delivery**, causing refetch storms. That architecture is **retired** — see [ADR-006](docs/adr/006-realtime-state-delivery.md).

| Event (legacy) | Was | Now |
|----------------|-----|-----|
| `map:updated` | empty ping → full `GET /maps` | `game:patch` with `{ map }` |
| `monsters:changed` | IDs only → `GET /monsters` | `game:patch` with `{ monsters }` |
| `damage:applied` | fan-out reloads | animation only; state via `game:patch` |
| `map:token_moved` | ignored token, reloaded maps | `game:patch` `{ tokens }` or token delta |

---

## Target architecture

```
            ┌─────────────────────── Server (authoritative) ──────────────────────┐
  command   │  validate → write DB (one tx) → compute patch  ──→ publish patch     │
  (HTTP)    │      │                                │                    │          │
  ──────────┼──────┘                                │                    │          │
            │                                       ▼                    ▼          │
  response  │                              GamePatch (deltas)     game:patch event  │
  (HTTP) ◀──┼────────────────────────────────────┘                    │            │
            └──────────────────────────────────────────────────────────┼──────────-┘
                                                                         ▼
                          other clients apply the same GamePatch (no refetch)
```

**Principles**

1. **HTTP = commands + errors.** Mutations stay request/response for auth, validation, and explicit errors.
2. **WebSocket = state delivery.** Every successful mutation publishes the **same patch** returned to the initiator.
3. **One apply path.** Initiator applies HTTP response; peers apply socket patch via `applyGamePatch`.
4. **Full fetch only on connect / reconnect.** Initial load + `resyncAll` only.
5. **No silent fallbacks.** Invalid patches → explicit `resyncAll()`.

---

## Phase A — Stop the refetch storms — **DONE**

All items complete (dedupe loaders, actor skip, initiator apply, token deltas).

---

## Phase B — Mutation responses carry state — **DONE**

`GamePatch` on HTTP responses; initiator applies via `applyGamePatch` / domain apply helpers.

---

## Phase C — Rich socket payloads — **DONE**

`game:patch` unified event; legacy pings retired; reconnect `resyncAll`.

---

## Phase D — Server efficiency — **DONE** (cache deferred)

- [x] D.1 N+1 fix in `listGameMaps`
- [-] D.1 benchmark
- [x] D.2 cheap `activeMapId` via `getGameActiveMapId`
- [x] D.3 `buildGamePatch` helpers in `game-state.ts`
- [-] D.4 in-process cache (deferred per ADR-003)

---

## Phase E — Client data-layer consolidation — **DONE**

- [x] E.1 Optimistic-then-reconcile: token move, HP nudge (PC + monster), light toggle/select
- [x] E.2 Derived attack-target maps from entity `stats.custom`
- [x] E.3 Centralized apply paths (`applyGamePatch`, no raw `setMonsters`/`setMaps` in UI)
- [x] E.4 ADR-004 updated — hooks + patch model sufficient; TanStack Query deferred

---

## Phase F — Validation, tests, docs — **DONE** (integration deferred)

- [x] F.1 Shared `validateGamePatch` tests; web `applyGamePatch` reducer tests
- [-] F.1 API integration patch parity tests (needs running DB)
- [-] F.1 Two-client e2e simulation
- [x] F.2 ADR-006 + `ARCHITECTURE.md` realtime section
- [x] F.3 DM panel full-list fetch counter (`GameFetchMetricsBar`)

---

## Out of scope (unchanged)

- Redis adapter / multi-instance (ADR-003)
- TanStack Query migration (ADR-004, revisit if pain returns)
- New gameplay features, theming, mobile/PWA

---

## Related docs

- [docs/adr/006-realtime-state-delivery.md](docs/adr/006-realtime-state-delivery.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/adr/README.md](docs/adr/README.md)
