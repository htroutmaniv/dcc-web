# DCC Web — Realtime & Client Data-Layer Plan

Plan to shift the app from **client-driven refetch** to **server-authoritative state delivery**: the server owns the database and computes new state on every mutation, then pushes that state to clients over WebSocket. Clients apply patches instead of re-pulling full snapshots.

> The prior **Architectural Remediation Plan** (Phases 0–6) is complete and lives in git history at the previous commit. This document supersedes it as the active roadmap.

**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[-]` cancelled / deferred

**Effort:** S ≤ 1 day · M = 2–4 days · L = 1+ week

> **Progress (2026-06-15):** Phase A complete. Phase B.1–B.2 complete (mutation responses carry `map`; initiator applies via `applyMapFromServer` / apply-damage response). Next: Phase B.3 (`GamePatch` type) and Phase C (rich socket payloads).

---

## The problem (why this plan exists)

Today the server is authoritative for the DB and **does** emit socket events, but most events are **invalidation pings**, not **state delivery**. So after any mutation the client re-pulls full lists:

| Event | Payload today | Client reaction today |
|-------|---------------|-----------------------|
| `map:updated` | `{ actorUserId }` only | `GET /games/:id/maps` (full, N+1) |
| `monsters:changed` | `{ monsterIds }` | `GET /games/:id/monsters` |
| `damage:applied` | target metadata | reload **characters + monsters + detail + maps** |
| `map:token_moved` | `{ token }` | full `loadMaps()` (ignores the token!) |
| `character:upsert` | full character ✅ | apply locally ✅ |

Consequences observed:

1. **Refetch storms** — one damage application = 7+ HTTP requests for the DM (mutation handler reloads 3 lists, socket handler reloads 4 more).
2. **Duplicate work** — the write path runs `syncActiveMapTokens` (loads all chars/monsters/tokens, plans, writes, reloads the map DTO), **discards the result**, then the client re-fetches the same map via `GET /maps`.
3. **N+1 reads** — `listGameMaps` issues one `loadMapTokens` query per map and a full `loadGameWithSettings`.
4. **Wasted deltas** — `map:token_moved` already carries the moved token, but the client throws it away and reloads every map.

The DB itself is fast (single-digit ms in logs). The latency is **round-trip fan-out**, not query speed.

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

1. **HTTP = commands + errors.** Mutations stay request/response for auth, validation, and explicit errors. The initiator waits only for *that* round-trip.
2. **WebSocket = state delivery.** Every successful mutation publishes the **same patch** it returned to the initiator. Other clients apply it; nobody refetches.
3. **One apply path.** Initiator applies the HTTP response; everyone else applies the socket patch. Identical reducer, identical end state.
4. **Full fetch only on connect / reconnect.** Initial load + resync-on-reconnect are the only places we pull whole lists.
5. **No silent fallbacks.** Patches are validated on receipt; a malformed/partial patch triggers an explicit resync, never a quietly-guessed merge. (Honors `.cursor/rules/no-silent-fallbacks`.)

---

## Phase A — Stop the refetch storms (quick, low-risk wins)

Goal: cut redundant requests without changing the wire contract. Ship first; immediate felt improvement.

### A.1 Dedupe in-flight `loadMaps` / list loaders — S
- [x] In `apps/web/src/hooks/game/useGameMaps.ts`, store an in-flight promise ref; concurrent `loadMaps()` callers share one request instead of each hitting `/maps`.
- [x] Same pattern for `useCharacters.loadCharacters` and `useMonsters.loadMonsters`.
- [x] Coalesce the realtime debounce (`MAP_RELOAD_DEBOUNCE_MS`) with the dedupe so a burst of events = one fetch.

### A.2 Skip actor refetch on `damage:applied` — S
- [x] In `useGameRealtimeSync.ts` `onDamageApplied`, return early when `actorUserId === userId` (mirror `map:updated` / `monsters:changed`). The initiator's `useCombatActions.applyDamage` already reloads.
- [x] Confirm `damage:applied` payload carries `actorUserId` end-to-end (it does in `routes/dice.ts`); thread it into the `onDamageApplied` handler signature (currently dropped in `useGameSocket.ts`).

### A.3 Trim the initiator's apply-damage fan-out — S
- [x] `useCombatActions.applyDamage` currently calls `loadCharacters` + `loadMonsters` + `loadDetail`. The route already returns `outcome` and publishes `character:upsert`. Reduce to applying the returned character/monster/map/initiative from the HTTP response.

### A.4 Apply `map:token_moved` as a delta — S
- [x] `useGameSocket.ts` `map:token_moved` currently calls `onMapUpdated()` (full reload). Add an `onTokenMoved(token)` handler that patches just that token in `useGameMaps`.
- [x] Initiator's `moveMapToken` already updates local optimistically; reconcile from the response without a full `loadMaps`.

**Exit criteria:** a single damage/kill/move action produces ≤ 1 follow-up GET on the initiator and **zero** on other clients (they apply payloads). Measured in server logs.

---

## Phase B — Mutation responses carry state (initiator path)

Goal: every write that already computes new server state **returns** it, so the initiator never re-fetches.

### B.1 Return the synced map from token-affecting mutations — M
- [x] `syncActiveMapTokens(gameId)` already returns `GameMapDto | null`. Surface it in responses for:
  - [x] `DELETE /games/:id/monsters/:id` (`routes/monsters.ts`)
  - [x] monster kill / in-play PATCH (`routes/monsters.ts`)
  - [x] character status PATCH dead/alive + `mapTokenVisible` change (`routes/characters.ts`)
  - [x] `POST /games/:id/characters` (create) and apply-damage death (`routes/dice.ts`)
- [x] Shape: `{ ...existing, map?: GameMapDto }`.

### B.2 Initiator applies map response instead of `loadMaps()` — S
- [x] `useMonsterActions.killMonster` / `deleteMonsterQuick` → `applyMapFromServer(res.map)` instead of `await loadMaps()`.
- [x] `useCharacterActions.patchCharacterStatus` / `toggleCharacterMapToken` / `createCharacter` → same.
- [x] `useCombatActions.applyDamageFromRoll` applies character/monster/map/initiative from response.

### B.3 Standardize the mutation envelope — M
- [ ] Define a `GamePatch` type in `packages/shared/src/game-events.ts`:
  ```ts
  type GamePatch = {
    characters?: { upserted?: CharacterDto[]; deletedIds?: string[] };
    monsters?: { upserted?: MonsterDto[]; deletedIds?: string[] };
    map?: GameMapDto;                 // full active-map snapshot (small)
    tokens?: { upserted?: MapTokenDto[]; deletedIds?: string[] };
    initiative?: GameInitiativeState | null;
    settings?: Partial<GameSettings>;
  };
  ```
- [ ] Mutations return `{ ok: true, patch: GamePatch }` (plus any command-specific result like `outcome`).
- [ ] Keep existing fields during migration; add `patch` alongside, then remove the redundant top-level fields in a later pass.

**Exit criteria:** initiator-side `loadMaps()` / `loadCharacters()` / `loadMonsters()` calls remain **only** in initial load and reconnect resync.

---

## Phase C — Rich socket payloads (replace invalidation pings)

Goal: other clients receive the same `GamePatch` and apply it; no socket handler triggers a full refetch.

### C.1 Add a unified `game:patch` event — M
- [ ] Extend the `GameEvent` union in `packages/shared/src/game-events.ts` with `{ type: 'game:patch'; patch: GamePatch; actorUserId?: string }`.
- [ ] `publish`/`publishMany` in `apps/api/src/lib/game-events.ts` already forward arbitrary payloads — no transport change needed.
- [ ] After each mutation, publish the **same** `GamePatch` returned to the initiator (single source of truth for "what changed").

### C.2 Client patch reducer — M
- [ ] Add `applyGamePatch(patch)` in the controller (`useGamePageController.ts`) that fans out to `applyCharacterFromServer`, `handleMonsterUpdated`, `applyMapFromServer`, `applyInitiative`, `applyGameSettingsPatch`.
- [ ] `useGameRealtimeSync.onGamePatch` → `applyGamePatch`, with `actorUserId === userId` short-circuit (initiator already applied via HTTP response).
- [ ] Validate the patch shape on receipt; on validation failure, fall back to a **single** targeted resync (not silent partial merge).

### C.3 Enrich or retire the legacy ping events — M
- [ ] `map:updated` → carry `{ map }` (deprecate empty-payload form); or emit `game:patch` with `map` and drop `map:updated`.
- [ ] `monsters:changed` → carry `{ monsters: { upserted, deletedIds } }` instead of just IDs.
- [ ] `damage:applied` → keep for log/animation purposes, but it should no longer drive list refetches (state arrives via `game:patch` / `character:upsert`).
- [ ] `map:token_moved` → already carries the token; route it through the token delta path (A.4), not a reload.

### C.4 Reconnect resync stays full — S
- [ ] Keep `onConnected` doing `loadDetail` + `loadDiceRolls` (+ maps/characters/monsters) as the authoritative catch-up after any missed events. This is the only sanctioned full pull post-initial-load.

**Exit criteria:** with two clients open, a mutation by one produces **zero** `GET /maps|/monsters|/characters` on the other; both reach identical state via `game:patch`.

---

## Phase D — Server efficiency & optional cache

Goal: make the server-side write+compute cheap enough that patches are effectively free.

### D.1 Fix `listGameMaps` N+1 — M
- [ ] In `apps/api/src/services/map-service.ts`, replace the per-map `loadMapTokens` loop with one `mapToken.findMany({ where: { mapId: { in: mapIds } } })` grouped in memory.
- [ ] Benchmark before/after on a game with multiple maps.

### D.2 Cheap `activeMapId` lookup — S
- [ ] `syncActiveMapTokens` currently calls full `listGameMaps` just to read `activeMapId`. Read it directly from the `Game.activeMapId` column (Phase 2.1 added it) via a lightweight `select`.

### D.3 Single-tx mutation + patch builder — M
- [ ] Add `buildGamePatchAfter*` helpers in `apps/api/src/services/game-state.ts` that, given a mutation, return the minimal `GamePatch` (e.g., `onMonsterDeleted` → deleted monster id + resynced active map + initiative).
- [ ] Reuse these in both the HTTP response (Phase B) and the socket publish (Phase C) so they can never diverge.

### D.4 Optional in-process per-game cache — M (defer unless needed)
- [-] Consider an in-memory `Map<gameId, GameState>` on the single API instance to avoid re-reading unchanged entities when building patches. **Deferred**: only pursue if profiling shows DB reads dominate after D.1–D.3. Must move to Redis if/when multi-instance (see ADR-003). Cache is a server optimization only — clients never depend on it.

**Exit criteria:** building and publishing a `GamePatch` costs ≤ the single mutation's own write; no N+1 in the maps read path.

---

## Phase E — Client data-layer consolidation

Goal: one predictable apply path, optimistic UX, no stale-override bugs.

### E.1 Optimistic-then-reconcile pattern — M
- [ ] For high-frequency actions (token move, HP nudge, light toggle), update local state immediately, then reconcile from the command response / `game:patch`.
- [ ] On error or patch-validation failure, roll back to last server state and surface the error (no silent swallow).

### E.2 Remove redundant local override maps — S
- [ ] Audit `characterAttackTargetById` / `monsterTargetById`: now that `loadCharacters` reads server state, drop client-only override layers that can desync (the stale-target cleanup effect already pushes truth to the server).

### E.3 Centralize "apply server entity" — S
- [ ] Ensure `applyCharacterFromServer`, `handleMonsterUpdated`, `applyMapFromServer`, `applyInitiative` are the **only** mutators of their slices, and `applyGamePatch` is the only thing realtime calls. No component sets list state directly.

### E.4 Revisit TanStack Query decision — S (ADR update, not necessarily adoption)
- [ ] With a clean patch/reducer model, re-evaluate ADR-004. If `game:patch` + reducer is sufficient, record that the decision stands; if cache-invalidation pain reappears, scope a strangler migration (characters first).

**Exit criteria:** every state slice has exactly one server-apply entry point; realtime updates flow through a single `applyGamePatch`.

---

## Phase F — Validation, tests, docs

### F.1 Tests — M
- [ ] Shared: unit-test `applyGamePatch` reducer (upsert/delete/merge ordering, idempotency).
- [ ] API integration (extend `apps/api/test/`): mutation returns a `patch` equal to the published `game:patch` for delete-monster, mark-dead, move-token, apply-damage.
- [ ] Web: two-client simulation (or reducer-level) asserting non-initiator reaches the same state with **zero** list fetches.

### F.2 Wire-contract docs + ADR — S
- [ ] Add `docs/adr/006-realtime-state-delivery.md`: command/HTTP + patch/WebSocket split, `GamePatch` schema, resync-on-reconnect rule, actor short-circuit.
- [ ] Update `docs/ARCHITECTURE.md` realtime section and the event table above as events are enriched/retired.

### F.3 Observability — S
- [ ] Add a debug counter (DM panel or log) for "full list fetches per minute" to prove the storms are gone and catch regressions.

**Exit criteria:** the new contract is documented, tested, and measurable.

---

## Sequencing & dependencies

```
Phase A (storms) ──→ Phase B (responses) ──→ Phase C (socket patches) ──┐
                                  └────────→ Phase D (server eff.) ──────┼─→ Phase E ─→ Phase F
```

- **Phase A** ships independently and immediately (no contract change) — do first.
- **Phase B** before **C**: define `GamePatch` once, prove it on the initiator path, then reuse for sockets.
- **Phase D** can run parallel to C (server-internal).
- **Phase E** depends on B+C (single apply path needs the patch model).
- **Phase F** finalizes once the contract is stable.

---

## Risks & mitigations

- **Patch/refetch divergence** → build the patch once (D.3) and use it for both HTTP response and socket publish.
- **Missed events / out-of-order** → keep authoritative resync on reconnect (C.4); validate patches and resync-on-failure (C.2) rather than silently merging.
- **Player visibility rules** (e.g., hidden monsters) → patches must respect per-viewer filtering; do not leak DM-only entities in `game:patch`. Filter server-side per room or per socket as today's list endpoints do.
- **Optimistic rollback bugs** → snapshot previous slice before optimistic write; reconcile or restore explicitly.

---

## Out of scope (for now)

- Redis adapter / multi-instance fan-out (ADR-003) — only if horizontal scale is needed.
- Full migration to TanStack Query / a normalized cache (ADR-004) — revisit in E.4.
- New gameplay features, theming, mobile/PWA.

These remain available once the realtime data-layer is server-authoritative.
