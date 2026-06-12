# DCC Web

Dungeon Crawl Classics session manager: character sheets, server dice, tactical maps.

## How it runs

**nginx (Docker)** → proxies to **Node API** and **Vite** on your machine. **Postgres (Docker)** for data.

Same layout for daily dev and production-like runs — see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

```bash
bun run setup
# or: bun scripts/ensure-env.ts && bun install && bun run stack && bun run db:migrate
```

Env is split: **`.env`** (secrets) + **`.env.development`** / **`.env.production`** (profiles). Dev commands use the development profile; `bun run prod` uses production.

In **two terminals**: `bun server` and `bun bundler`. Open **http://localhost:8080**

## Scripts

| Script | What |
|--------|------|
| `bun server` + `bun bundler` | Dev API watch + Vite HMR (development profile) |
| `bun run prod` / `bun run start` | Build + production stack + API + Vite preview |
| `bun run stack` | Postgres + nginx (development profile, :8080) |
| `bun run stack:prod` | Recreate nginx for production (TLS / :443) |
| `bun run build` | Compile shared, API, web |

## Docs

- [Development / structure](docs/DEVELOPMENT.md)
- [Production deployment (hat3d.com)](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
