# DCC Web

Dungeon Crawl Classics session manager: character sheets, server dice, tactical maps, and live game sync.

## Architecture

Bun monorepo with three packages:

| Package | Stack | Role |
|---------|-------|------|
| `apps/web` | React 19, MUI, Konva, Vite | SPA — lobby, game page, character sheets, tactical map |
| `apps/api` | Bun, Fastify, Prisma, Socket.IO | REST + WebSocket on one process; map file storage |
| `packages/shared` | TypeScript, Zod | DTOs, validators, DCC domain logic (imported by API and web) |

**Runtime layout:** Docker runs **nginx** (reverse proxy) and **Postgres**. The API and Vite dev/preview server run on the host as separate processes so backend reloads do not restart the frontend bundler.

```
Browser → nginx (:8080 dev / :443 prod)
            ├─ /           → Vite (dev HMR or prod preview)
            ├─ /api        → Fastify REST
            └─ /socket.io  → Socket.IO (same API process)
          Postgres + local map uploads (data/uploads/maps)
```

**Design notes (current scale):**

- **Single API process** with in-memory Socket.IO rooms and presence — supports many concurrent games on one host; horizontal scaling deferred ([ADR-003](docs/adr/003-realtime-single-instance.md)).
- **Client state:** hooks + socket sync — no TanStack Query ([ADR-004](docs/adr/004-client-data-layer.md)).
- **Game settings:** typed DB columns composed via `composeGameSettingsFromRecord` — no legacy settings JSON blob.
- **Operability:** `/health` and `/ready` endpoints, request IDs in logs, DM audit log.

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [ADRs](docs/adr/README.md) · [remediation plan](plan.md)

## Quick start

**Prerequisites:** [Bun](https://bun.sh), Docker (Postgres + nginx).

```bash
bun run setup
```

Then in **two terminals**:

```bash
bun server      # API with watch reload
bun bundler     # Vite dev server with HMR
```

Open **http://localhost:8080**

Env is split: **`.env`** (secrets) + **`.env.development`** / **`.env.production`** (profiles). Dev commands load the development profile; `bun run prod` loads production. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the three-terminal workflow and profile overrides.

---

## Scripts

All commands run from the repo root unless noted.

### Setup & build

| Script | Description |
|--------|-------------|
| `bun run setup` | First-time setup: ensure env files, install deps, generate Prisma client, start Docker **Postgres + nginx**, migrate DB, seed reference data (occupations, names, catalog). |
| `bun run build` | Production build: compile `shared` → `api` → `web`. |
| `bun run build:shared` | Compile `@dcc-web/shared` only (API server auto-builds shared on `bun server`). |
| `bun run typecheck` | Type-check all workspaces (`shared` + `api` build, then `web` tsc). |

### Development

| Script | Description |
|--------|-------------|
| `bun server` | Start API in watch mode (development profile). Rebuilds shared, stops any prior API process, runs `@dcc-web/api` with `bun --watch`. |
| `bun bundler` | Start Vite dev server with HMR (development profile). |
| `bun run shared` | Watch-compile `@dcc-web/shared` — use when editing shared types/domain logic in a third terminal. |
| `bun run stack` | Start/recreate Docker **Postgres + nginx** for development (`:8080`, no TLS). |
| `bun run stack:down` | Stop all Docker Compose services. |
| `bun run stop:server` | Stop the dev API process. |
| `bun run stop:bundler` | Stop the Vite dev server. |
| `bun run docker:logs` | Follow Docker Compose logs. |

**Daily dev (recommended):** terminal 1 → `bun run stack` (once) · terminal 2 → `bun server` · terminal 3 → `bun bundler`

### Production

| Script | Description |
|--------|-------------|
| `bun run prod` | Full production startup (production profile): stop prior prod processes, build all packages, start **Postgres** (wait for healthy), run prod migrations, recreate **nginx** with TLS, start compiled API + Vite preview. |
| `bun run start` | Alias for `bun run prod`. |
| `bun run start:server` | Run compiled API only (`bun dist/index.js`) — normally invoked by `prod`. |
| `bun run start:bundler` | Run Vite preview server (`:5173`) — normally invoked by `prod`. |
| `bun run stack:prod` | Start Postgres + recreate nginx for production (TLS / `:443`) without building or starting API/web. |
| `bun run stop:prod` | Stop production API and preview processes. |

Production deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Database

| Script | Description |
|--------|-------------|
| `bun run db:generate` | Regenerate Prisma client after schema changes. |
| `bun run db:migrate` | Apply pending migrations (`migrate deploy`) — used by setup, CI, and prod. |
| `bun run db:migrate:dev` | Create/apply migrations in development (`migrate dev`). |
| `bun run db:migrate:prod` | Apply migrations under the production env profile. |
| `bun run db:seed` | Seed reference data (occupations, character names, item/monster catalog). Idempotent upserts. |

Workspace-only (from `apps/api`): `db:push`, `db:studio`.

### Test

| Script | Description |
|--------|-------------|
| `bun run test` | Run unit tests in all workspaces: `shared`, `api`, `web`. |
| `bun run typecheck` | Compile-check shared + API and typecheck web (no test run). |

**API integration tests** (`apps/api/test/integration/`) exercise auth, games, characters, initiative, and transfers against a real Postgres database. They run automatically in **CI** (`GITHUB_ACTIONS=true`). Locally they are **skipped by default** to avoid requiring a configured test DB.

To run integration tests locally:

```bash
# Postgres must be reachable (e.g. bun run stack) and DATABASE_URL set
export RUN_INTEGRATION_TESTS=1
bun run --filter @dcc-web/api test
```

Run a single workspace:

```bash
bun run --filter @dcc-web/shared test
bun run --filter @dcc-web/api test
bun run --filter @dcc-web/web test
```

---

## Docs

| Doc | Contents |
|-----|----------|
| [Development / structure](docs/DEVELOPMENT.md) | Env profiles, daily workflow, monorepo layout |
| [Production deployment](docs/DEPLOYMENT.md) | TLS, health checks, single-instance realtime |
| [Architecture](docs/ARCHITECTURE.md) | As-built system design |
| [Architecture decision records](docs/adr/README.md) | ADR index |
| [Data model](docs/DATA-MODEL.md) | Prisma schema overview |
| [Remediation plan](plan.md) | Completed remediation phases |
