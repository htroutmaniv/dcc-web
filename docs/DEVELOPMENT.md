# Development

## One topology, separate processes

nginx + Postgres run in Docker. **API** and **Vite** run on the host in **separate terminals** so backend reloads do not restart the bundler (and vice versa).

Open the app at **http://localhost:8080** (nginx → host ports 3001 + 5173).

## Setup (once)

```bash
bun run setup
# or manually: cp .env.example .env && bun install && bun run stack && bun run db:migrate
```

`bun server` auto-creates `.env` from `.env.example` if missing.

## Daily dev — three terminals (recommended)

**Terminal 1 — infrastructure**

```bash
bun run stack
```

**Terminal 2 — backend** (reloads only when `apps/api` changes)

```bash
bun server
```

**Terminal 3 — frontend** (HMR only when `apps/web` changes)

```bash
bun bundler
```

Optional **Terminal 4** — if you edit `packages/shared`:

```bash
bun run shared
```

Then restart `bun server` once after shared exports change (or leave `shared` watching and restart API when needed).

## Script reference

| Command | What |
|---------|------|
| `bun run stack` | Postgres + nginx proxy |
| `bun server` | API with `bun --watch` |
| `bun bundler` | Vite dev server |
| `bun run shared` | `tsc --watch` on shared package |
| `bun run start:server` | Compiled API (no watch) |
| `bun run start:bundler` | Vite preview (built web) |
| `bun run start` | Build + stack + both prod-like processes |

`bun server` and `bun bundler` are shorthand for `bun run server` / `bun run bundler`.

## npm fallback

Same scripts work with npm if Bun is not installed:

```bash
npm run server
npm run bundler
```

(API uses `bun --watch` in package.json — install Bun for the server script, or use `npm run dev -w @dcc-web/api` with tsx if you add it back.)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 at :8080 | Both `bun server` and `bun bundler` must be running |
| API import errors from shared | `bun run build:shared` or `bun run shared` |
| HMR broken | `VITE_HMR_CLIENT_PORT=8080` in `.env` |
