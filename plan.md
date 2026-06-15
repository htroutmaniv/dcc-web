# DCC Web — Architectural Remediation Plan

Prioritized plan to address findings from the principal-architect review. Items are ordered by criticality and grouped into phases so each phase delivers shippable value and reduces risk for the next.

**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[-]` cancelled / deferred

**Effort:** S ≤ 1 day · M = 2–4 days · L = 1+ week

---

## Phase 0 — Safety net (do first, blocks nothing)

Goal: stop shipping refactors blind. Cheapest interventions, highest leverage for everything after.

### 0.1 Test runner for `packages/shared` — S
- [x] Add `bun:test` (or Vitest if you prefer the ecosystem) to `packages/shared`.
- [x] Write tests for the pure domain logic:
  - [x] `initiative.ts` — `advanceInitiativeTurn`, `normalizeInitiativeTurnIndex`, `createCharacterInitiativeSkipFn`, `getCurrentTurnEntry`, `isCharacterTurn`
  - [x] `movement.ts` — `computeMovementFeet`, `movementRangeFromStats`, `parseGameSettings` (every default path)
  - [x] `dice-notation.ts` — `rollDice` with a deterministic RNG injected
  - [x] `combat-mortality.ts` — `getCharacterVitality`, `resolveMonsterAfterHpChange`
  - [x] `monster-sheet.ts` — `parseMonsterSheet` (including the recently-fixed empty-attacks case)
  - [x] `consumables.ts` — light source presets, `getCharacterLightRadiusFeet`, `resolveActiveLightItemId`
  - [x] `map-token-layout.ts` — `computeUpperLeftTokenGrid` / `computeUpperRightTokenGrid`

### 0.2 API integration test harness — M
- [ ] Choose: testcontainers-postgres **or** a shared throwaway db with schema-per-test.
- [ ] Add `apps/api/test/` with a `buildTestApp()` helper that boots `buildApp()` against the test db.
- [ ] First five tests (smoke):
  - [ ] `POST /auth/dev-login` + `GET /auth/me` round-trip
  - [ ] `POST /games` then `POST /games/join/:invite` as a second user
  - [ ] `PATCH /characters/:id` with `status: 'dead'` triggers initiative reconcile + map sync
  - [ ] `POST /games/:id/transfer-item` rejects player-to-player while initiative active
  - [ ] `POST /games/:id/initiative/start` + `/advance` cycles round and ticks mortality

### 0.3 CI — S
- [x] Add a workflow that runs on PR:
  - [x] `bun install`
  - [x] `bun run --filter @dcc-web/shared build` + tests
  - [x] `bun run --filter @dcc-web/api build` + tests *(API tests deferred to 0.2)*
  - [x] `bun run --filter @dcc-web/web build` (typecheck via `tsc --noEmit`)
- [x] Add `bun run typecheck` script at root (run `tsc --noEmit` in each workspace).

### 0.4 Shared tsconfig base — S
- [x] Add `tsconfig.base.json` at repo root with `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`.
- [x] Have `apps/api`, `apps/web`, `packages/shared` extend it; keep only env-specific overrides (target, module, jsx).
- [x] Fix any lints surfaced (api currently lacks `noUnusedLocals` — expect cleanup). *(shared + api + web typecheck green as of 2026-06-15)*

**Exit criteria:** PR pipeline green; every push runs the suite; refactors in later phases are guarded.

> **Progress (2026-06-15):** 0.1, 0.3, and 0.4 complete. 43 shared unit tests passing. CI workflow added. **0.2 (API integration tests) remains** — Phase 0 not fully closed until that lands.

---

## Phase 1 — Security & hardening (do before any production traffic)

### 1.1 Fail-fast on missing prod secrets — S
- [ ] In `apps/api/src/lib/config.ts`, throw at boot when `NODE_ENV === 'production'` and any of these are unset / placeholder:
  - [ ] `JWT_SECRET` (and is not `'dev-only-change-in-production'`)
  - [ ] `CORS_ORIGIN` (and isn't `*`)
  - [ ] `DATABASE_URL` (no `localhost` fallback in prod)
  - [ ] If email auth is enabled: `RESEND_API_KEY`, `MAIL_FROM`, `PUBLIC_URL`
- [ ] Log a single, clear startup error and exit non-zero.

### 1.2 Rate limiting — S
- [ ] Add `@fastify/rate-limit`.
- [ ] Per-IP global default (e.g., 300 req / min).
- [ ] Tighter buckets:
  - [ ] `POST /auth/login` — 5/min/IP, 20/hour/account
  - [ ] `POST /auth/register` — 3/min/IP, 10/day/IP
  - [ ] `POST /auth/resend-verification` — 1/min/email
  - [ ] `POST /auth/dev-login` — 30/min/IP (still useful in dev, harmless if `ENABLE_DEV_LOGIN` is false)
  - [ ] `POST /games/join/:inviteCode` — 10/min/IP
  - [ ] `POST /dice/roll` — 60/min/user (cheap defence against spam)

### 1.3 CSRF posture — M
- [ ] Decide via ADR (see Phase 6): double-submit token vs `SameSite=Strict` on the session cookie.
- [ ] If staying with `Lax`: add `@fastify/csrf-protection`, mint a token on `GET /auth/me`, validate on every non-GET. Update `apps/web/src/api/client.ts` to attach `X-CSRF-Token` automatically.
- [ ] Add a test covering "cross-site POST without token is rejected".

### 1.4 CORS tightening — S
- [ ] Remove the `'*' → true` branch in `parseCorsOrigins`. With `credentials: true`, wildcard is meaningless; reject the config explicitly.
- [ ] Require a comma-separated allowlist in production.

### 1.5 Invite code RNG — S
- [ ] Replace `Math.random()` in `apps/api/src/lib/game-access.ts:23-30` with `secureRandomInt` (already used elsewhere).
- [ ] While there: enforce uniqueness by retrying on the (unlikely) collision.

### 1.6 Validate `stats.custom` and `combat` shapes — M
- [ ] Build a concrete Zod schema for `CharacterStatsCustom` in `packages/shared/src/schemas.ts` listing the keys that exist today:
  - [ ] `activeInPlay`, `selectedWeaponId`, `selectedWeaponName`, `selectedArmorId`, `selectedShieldId`, `selectedArmorName`, `selectedShieldName`, `baseSpeed`, `usingLightSource`, `activeLightItemId`, `mapTokenVisible`, `attackTargetRef`, `occupation`, `race`, `startingFunds`, `luckySign`, `languages`
- [ ] Same for `combat`: `ac`, `hpMax`, `hpCurrent`, `hpTemp`, `markedDead`, `lastDeathRound`, etc.
- [ ] Use `.passthrough()` *initially* with a soft warn-log so we catch any field we forgot; flip to `.strict()` after a release.
- [ ] Update `patchCharacterSchema` to use these instead of `z.record(z.unknown())`.

### 1.7 Cookie parsing reuse — S
- [ ] Replace the custom parser in `apps/api/src/lib/game-socket.ts` with `app.parseCookie(cookieHeader)` from `@fastify/cookie`.

**Exit criteria:** prod boot refuses to start with bad config; brute-force endpoints rate-limited; no path accepts arbitrary JSON payloads into player-controlled fields.

---

## Phase 2 — Data integrity (eliminate silent overwrites)

### 2.1 Decompose `Game.settings` — L
- [ ] Add Prisma migration introducing:
  - [ ] `GameInitiative` table: `gameId PK FK`, `state Json`, `version Int`, `updatedAt`
  - [ ] `Game.activeMapId String? @db.Uuid` FK column with `onDelete: SetNull`
  - [ ] `Game.monstersVisibleOnMap Boolean`, `Game.sharedMonsterInitiative Boolean`, `Game.hideMonsterAcInRollLog Boolean`
  - [ ] `Game.gridFtPerCell Decimal(6,2)`, `Game.playerTokenMovement TokenMovementMode` (new enum)
- [ ] Data migration: backfill from `settings` Json blob into the new columns, then drop `settings`.
- [ ] Update `parseGameSettings` to read from the columns; keep a deprecation shim for one release if any external caller depends on the Json shape.

### 2.2 Optimistic concurrency on initiative writes — M
- [ ] All `saveInitiative` callers now do:
  - read `state` + `version`
  - compute next state
  - `update where { gameId, version }` data `{ state, version: { increment: 1 } }`
  - on `RecordNotFound` → reload, reapply, retry once (max 3)
- [ ] Wrap in a `withOptimisticRetry()` helper in `apps/api/src/lib/optimistic.ts`.
- [ ] Add a regression test that fires two concurrent `advanceInitiativeTurn` calls and asserts exactly one wins.

### 2.3 Map sync efficiency — M
- [ ] Rewrite `syncMapTokens` in `apps/api/src/services/map-service.ts` to:
  - load existing tokens, characters, monsters in **one batch** each
  - compute three sets: `toCreate`, `toUpdate` (with diff), `toDelete`
  - issue `createMany`, batched `update` (grouped by shape), `deleteMany` inside one `prisma.$transaction`
- [ ] Verify with the new integration test that PC count of 20 + monster count of 20 results in ≤ 4 statements rather than ~60.

### 2.4 Data retention / pruning — S each
- [ ] Add a daily Bun cron (or simple `setInterval` task in `index.ts` if no scheduler yet) to:
  - [ ] Trim `DiceRoll` per game to N=500 most recent (configurable via env)
  - [ ] Delete resolved `MovementRequest` rows older than 24h
  - [ ] Sweep orphan uploads in `data/uploads/maps/` not referenced by any `GameMap.imageUrl`

### 2.5 Map coords as floats — S
- [ ] Migration: `MapToken.x`, `MapToken.y`, `MovementRequest.target_x/y` → `Float` (or `Numeric(7,2)` if you want fixed-point).
- [ ] Remove the `Number(row.x)` conversions in `apps/api/src/services/map-service.ts`.

**Exit criteria:** no more JSON read-modify-write races; map sync is O(1) queries; data tables stop growing unbounded.

---

## Phase 3 — Backend cleanup & efficiency

### 3.1 Membership + DM Fastify decorators — M
- [ ] Add a plugin that resolves `:gameId` from the route, caches the result on `request.gameAccess`, and exposes:
  - [ ] `requireMember` preHandler
  - [ ] `requireDm` preHandler
- [ ] Replace the ~30 inline `assertGameMember` blocks across `routes/{characters,games,maps,monsters,initiative,dice}.ts`.
- [ ] Add a 30-second LRU keyed by `userId:gameId` (configurable, off in test) to cut DB hits on socket-heavy games.

### 3.2 Break map ↔ monster service cycle — S
- [ ] Create `apps/api/src/services/game-state.ts` to own cross-entity effects (e.g., `onMonsterDeleted(gameId, monsterId)` calls both `deleteTokensForMonster` and `syncMonsterGroupInitiative`).
- [ ] Remove the dynamic `await import('./map-service.js')` from `monster-service.ts:421`.

### 3.3 Domain event facade — M
- [ ] Add `apps/api/src/lib/game-events.ts` exposing `publish(gameId, event)` and `publishMany`.
- [ ] Centralize all `emitToGame` calls behind it.
- [ ] Define a discriminated `GameEvent` union in `packages/shared` so the client can switch on `event.type` exhaustively.
- [ ] Begin sending deltas in the event payload (e.g., `monsters:changed` includes the updated monster ids); client applies locally rather than refetching.

### 3.4 Multipart map uploads — M
- [ ] Add `@fastify/multipart`.
- [ ] Replace the base64-data-URL pipeline in `apps/api/src/services/map-service.ts:228-247`.
- [ ] Stream to disk under `STORAGE_PATH` (already in config but unused — wire it up).
- [ ] Use magic-byte sniffing (`file-type` package) to validate, not just the regex header.
- [ ] Filename = `${mapId}-${sha256}.{ext}`; switch old file out atomically.

### 3.5 Storage path consistency — S
- [ ] `apps/api/src/services/map-service.ts:19` and `apps/api/src/routes/maps.ts:28` both hardcode `process.cwd()/data/uploads/maps`. Read from `config.storagePath` once and reuse.

### 3.6 Remove deprecated paths — S
- [ ] Delete `POST /games/:gameId/characters/generate` (`apps/api/src/routes/characters.ts:182-213`).
- [ ] Delete `generateCharacterSchema` from `packages/shared/src/schemas.ts`.
- [ ] Delete `addMonstersToInitiative`, `buildMonsterInitiativeEntries` from `apps/api/src/services/monster-service.ts:634-647`.
- [ ] Audit other `@deprecated` markers and either implement removal or document why they stay.

### 3.7 Docker / deploy hygiene — S
- [ ] `apps/api/Dockerfile` currently runs `npx prisma migrate deploy` in CMD — race condition with multiple replicas. Move migrations to a one-shot init job and have the app container only run the server.
- [ ] Switch to `bun install --frozen-lockfile` instead of `npm install` for consistency with local dev.
- [ ] Gate `prisma generate` in root `postinstall` on `SKIP_POSTINSTALL=1` so CI install is faster.

**Exit criteria:** routes contain only domain logic; cross-cutting concerns (auth, events, uploads) live in plugins; deploy is reproducible.

---

## Phase 4 — Frontend decomposition

### 4.1 Split `GamePage.tsx` — L
Goal: from 1948 LOC + 79 hooks down to a ≤300-LOC orchestrator.

- [ ] Extract data layer hooks (one per file in `apps/web/src/hooks/game/`):
  - [ ] `useGameDetail(gameId)` — replaces `loadDetail`, returns `{ detail, isDm, refresh, settings }`
  - [ ] `useCharacters(gameId, isDm)` — replaces `loadCharacters` + character socket handler
  - [ ] `useMonsters(gameId, isDm)`
  - [ ] `useInitiative(gameId, isDm)`
  - [ ] `useGameMaps(gameId, isDm)`
  - [ ] `useDiceTray(gameId, characterId)`
  - [ ] `useRollLog(gameId)`
  - [ ] `usePresence(gameId)`
- [ ] Extract action layer (mutations) into the same hooks where they belong.
- [ ] Split the UI into:
  - [ ] `GameSidebar` (characters, monsters, presence)
  - [ ] `GameStage` (map + initiative overlay + drawing toolbar)
  - [ ] `GameDialogs` (apply damage, consume resource, create character, corpse loot, DM control panel)
- [ ] After the split, run all Phase-0 tests; add component tests for at least the dialog interactions.

### 4.2 Adopt TanStack Query — M
- [ ] Already recommended in `docs/ARCHITECTURE.md`. Decide via ADR (Phase 6).
- [ ] If adopted: replace each `loadX` + state-tuple with `useQuery`; replace `setX(prev => ...)` writes after socket events with `queryClient.setQueryData(...)`.
- [ ] Strangler-fig migration: do `characters` first, validate, then do the rest.

### 4.3 Component file-size budget — M
- [ ] Target ≤ 400 LOC per `.tsx` file. Files to split:
  - [ ] `EquipmentManagerDialog.tsx` (934)
  - [ ] `TacticalMapCanvas.tsx` (838) — already has `TokenRangeOverlay` + `MapTokenChip` internally; promote to siblings
  - [ ] `Level0CharacterSheet.tsx` (802) — split by sheet section
  - [ ] `CharacterSheetView.tsx` (617)
  - [ ] `CharacterListItem.tsx` (557)
  - [ ] `MonsterPanel.tsx` (532)
  - [ ] `ApplyDamageDialog.tsx` (512)

### 4.4 Code-splitting & bundle — S
- [ ] `React.lazy` for `GamePage`, `BestiaryPage` in `App.tsx`; wrap routes in `Suspense` with a small loading fallback.
- [ ] `React.lazy` for `EquipmentManagerDialog`, `MonsterSheetView`, `CharacterSheetView`, `CorpseLootSheet`.
- [ ] `vite.config.ts` → add `build.rollupOptions.output.manualChunks`:
  - `mui` → `@mui/*`, `@emotion/*`
  - `konva` → `konva`, `react-konva`
  - `socket` → `socket.io-client`
- [ ] Verify gzip bundle goal: initial chunk < 200 KB gzip, total deferred < 400 KB gzip.

### 4.5 Re-enable WebSocket transport in prod — S
- [ ] `apps/web/src/lib/game-socket-client.ts:19-23` currently forces `polling` in prod. Switch back to `['websocket', 'polling']`. nginx is already configured for upgrade.
- [ ] Add a feature-flag env var if you want a kill switch.

### 4.6 API client cleanup — S
- [ ] In `apps/web/src/api/client.ts`:
  - [ ] Return `undefined` for `204`
  - [ ] Branch on `Content-Type` before `res.json()`
  - [ ] Surface validation errors (Zod flatten output) in a structured way

**Exit criteria:** initial bundle slim; `GamePage` testable; no file > 400 LOC except generated.

---

## Phase 5 — Operability & realtime scale

### 5.1 Decide single-vs-multi-instance — ADR (see Phase 6)
- [ ] If staying single-instance: document the limit in `docs/DEPLOYMENT.md`; add a startup banner + `/health` field reporting "single instance".
- [ ] If scaling out:
  - [ ] Add Redis service to `docker-compose.yml`
  - [ ] Add `@socket.io/redis-adapter` wiring in `apps/api/src/index.ts`
  - [ ] Move `presenceByGame` Map from `apps/api/src/lib/game-presence.ts` into Redis (`game:{id}:presence` hash keyed by socketId)
  - [ ] Move the membership-LRU from 3.1 into Redis as well

### 5.2 Audit log — M
- [ ] New `AuditLog` Prisma model: `id, gameId, actorUserId, kind, targetType, targetId, payload Json, createdAt`.
- [ ] Log:
  - [ ] character: status change (kill / revive / archive), ownership change
  - [ ] monster: kill, in-play toggle
  - [ ] inventory: every transfer between owners
  - [ ] game: settings change, map clear/reset
- [ ] Surface in DM-only `GET /games/:id/audit?limit=...` and a debug pane in `DmControlPanel`.

### 5.3 Observability — S
- [ ] Already have pino via Fastify default; add request ids in logs (Fastify does this) and ensure they bubble through to `emitToGame` debug lines.
- [ ] Optional: Sentry on both API and web — env-gated.

### 5.4 Health & readiness — S
- [ ] Expand `GET /health` to include `db: 'ok'|'fail'`, `socket: 'ok'`, `version` (from package.json + git sha at build).
- [ ] Optional `/ready` that pings Postgres so nginx / k8s can gate traffic.

**Exit criteria:** prod can be safely operated, scaled, and audited.

---

## Phase 6 — Documentation & ADRs

### 6.1 ADRs to write — S each
Create `docs/adr/` and add:
- [ ] **ADR-001** Game state storage: dedicated tables vs JSON column with optimistic locking. *(Drives Phase 2.1.)*
- [ ] **ADR-002** Auth surface: keep email+JWT cookie, role of dev-login in prod, CSRF strategy. *(Drives Phase 1.3.)*
- [ ] **ADR-003** Realtime scope: single instance vs Redis adapter. *(Drives Phase 5.1.)*
- [ ] **ADR-004** Client data layer: keep ad-hoc state vs TanStack Query. *(Drives Phase 4.2.)*
- [ ] **ADR-005** Image storage: local FS vs object storage (S3/MinIO) when going multi-instance.

### 6.2 Doc/code drift cleanup — S
- [ ] `docs/ARCHITECTURE.md` recommends TanStack Query / Zustand / co_dm role — reconcile after ADRs.
- [ ] Remove unused `GamePlayerRole.co_dm` enum value OR implement the role (likely the latter; it's a small change once role checks live in the new decorators from 3.1).
- [ ] `README.md` add: link to plan.md, link to ADRs index, mention test commands.

### 6.3 Shared package reorganization — M
- [ ] `packages/shared/src/` is flat with 27 files. Group:
  - `combat/` — `combat-mortality`, `combat-roll`, `dice-roll-kind`, `dice-roll-target`
  - `dice/` — `dcc-dice`, `dice-notation`
  - `inventory/` — `consumables`, `item-properties`, `item-uses`, `loot`
  - `map/` — `map-drawings`, `map-grid`, `map-token-layout`, `map-token-visibility`
  - `initiative/` — `initiative`, `monster-initiative`
  - `monsters/` — `monsters`, `monster-sheet`, `monster-status`
  - `characters/` — `ability-scores`, `birth-augur`, `character-race`, `dcc-classes`, `dcc-saves`
  - `schemas/` — split `schemas.ts` per domain (auth, character, monster, map, game-settings)
- [ ] Keep `index.ts` as the public barrel.
- [ ] Split `consumables.ts` (640 LOC) into `consumable-types`, `consumable-parse`, `light-source`, `consumable-presets`.

**Exit criteria:** future contributors find decisions documented and code grouped by concern.

---

## Sequencing & dependencies

```
Phase 0 ──┬─→ Phase 1 ──┐
          ├─→ Phase 2 ──┼─→ Phase 3 ──┬─→ Phase 4
          └─────────────┘             └─→ Phase 5 ──→ Phase 6
```

- Phase 0 unblocks every later refactor. Do it first, do it fully.
- Phases 1 and 2 are independent of each other; pick whichever risk feels hotter.
- Phase 3 depends on Phase 2 (the decorator/event facade is much easier with first-class columns).
- Phase 4 can begin in parallel with Phase 3 once Phase 0 is done, but the API client cleanup (4.6) is easier after the event facade (3.3).
- Phase 5 needs Phase 3 (esp. event facade) to be sane.
- Phase 6 is mostly documentation; the ADRs themselves should be drafted **before** the corresponding phases start, ratified during, and finalized after.

---

## Definition of done per phase

A phase is "done" when:
1. All `[ ]` items in it are `[x]` or `[-]` (with a recorded reason).
2. CI is green on a PR that contains the phase's work.
3. No regression in the smoke tests from Phase 0.
4. Any new behavior is documented (README, docs/, or ADR).
5. Changelog entry added.

---

## Out of scope (for now)

- Feature work (new sheets, new monster types, fog of war, co-DM, mobile views, PWA).
- Theming / visual polish beyond what's required to validate splits in Phase 4.
- Migration to a different runtime (stay on Bun) or different DB.
- Self-hostable distribution / installer.

These can resume on the cleaned-up foundation after Phase 4.
