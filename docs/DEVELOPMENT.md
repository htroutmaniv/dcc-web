# Development

## One topology, separate processes

nginx + Postgres run in Docker. **API** and **Vite** run on the host in **separate terminals** so backend reloads do not restart the bundler (and vice versa).

Open the app at **http://localhost:8080** in development (`bun run stack` uses the **development** profile).

## Environment profiles

Secrets and profile settings are split so you can switch dev/prod without editing one file:

| File | Purpose |
|------|---------|
| `.env` | Secrets shared by both profiles (DB password, JWT, Resend) |
| `.env.development` | Dev URLs, `NGINX_TLS=false`, port 8080 |
| `.env.production` | Prod URLs, TLS, Let's Encrypt path |

`bun run setup` creates `.env`, `.env.development`, and `.env.production` from the `*.example` templates if missing.

**Switch to dev:** `bun run stack`, `bun server`, `bun bundler` (all load `.env` + `.env.development`).

**Switch to prod:** `bun run prod` (loads `.env` + `.env.production`, recreates nginx with TLS).

Optional gitignored overrides: `.env.development.local`, `.env.production.local`.

If you previously used a single `.env` for everything, move non-secret keys into the profile files (see the `*.example` templates). Keep secrets in `.env` only.

## Setup (once)

```bash
bun run setup
# or: bun scripts/ensure-env.ts && bun install && bun run stack && bun run db:migrate
```

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
| `bun run stack` | Postgres + nginx (**development** profile, port 8080) |
| `bun run stack:prod` | Recreate nginx with **production** profile (TLS / 443) |
| `bun server` | API with `bun --watch` (development profile) |
| `bun bundler` | Vite dev server (development profile) |
| `bun run shared` | `tsc --watch` on shared package |
| `bun run start:server` | Compiled API only — run `bun run build` first |
| `bun run start:bundler` | Vite preview only — run `bun run build` first |
| `bun run prod` | Build once + stack + API + preview together |
| `bun run start` | Alias for `prod` |

`bun server` and `bun bundler` are shorthand for `bun run server` / `bun run bundler`.

## npm fallback

Same scripts work with npm if Bun is not installed:

```bash
npm run server
npm run bundler
```

(API uses `bun --watch` in package.json — install Bun for the server script, or use `npm run dev -w @dcc-web/api` with tsx if you add it back.)

## Email sign-in

When `RESEND_API_KEY` and `MAIL_FROM` are set, the home page shows **Sign in / Create account** instead of dev login. Flow: register → verification email → click link → sign in.

For local testing with real email, set the Resend vars in `.env` and restart the API. Without them, use **Dev DM / Dev Player** (enabled when `NODE_ENV` is not `production`).

See [DEPLOYMENT.md](./DEPLOYMENT.md) §4 for Resend domain setup and production smoke tests.

## Dev login (DM vs player)

In local development, the header exposes two local-only accounts:

| Button | DB user | Use for |
|--------|---------|---------|
| **Dev DM** | `dev-dm@localhost` | Create games, DM controls, initiative |
| **Dev Player** | `dev-player@localhost` | Join with invite code, player UI |

Log out and switch accounts to test both sides. Each account has its own game list.

The old single `dev@localhost` user is no longer used; games tied to that account will not appear on the new logins.

## Real-time sync (Socket.IO)

When `bun server` and `bun bundler` (or nginx at :8080) are running, the game page opens a Socket.IO connection to the same origin (`/socket.io`, session cookie auth). After joining room `game:{gameId}`, clients receive:

| Event | When |
|-------|------|
| `character:upsert` | Create, patch, or item update |
| `initiative:updated` | Start, advance, end, end-turn |
| `dice:rolled` | Any `/dice/roll` in that game |

**Smoke test:** Dev DM in one browser on a game; Dev Player in another (or incognito). Player creates a character — DM character list should update without refresh. Restart `bun server` after API changes.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 at :8080 | Both `bun server` and `bun bundler` must be running |
| API import errors from shared | `bun run build:shared` or `bun run shared` |
| Equipment autocomplete empty | `bun run db:migrate` then `bun run db:seed` |
| HMR broken | `VITE_HMR_CLIENT_PORT=8080` in `.env` |
| `[vite] failed to connect to websocket` in console | **Vite hot-reload only** — not game sync. Open **http://localhost:8080** (not https). Restart `bun bundler` after vite config changes; `docker compose build nginx && docker compose up -d nginx` if nginx template changed. Safe to ignore if you are not editing frontend code. |
