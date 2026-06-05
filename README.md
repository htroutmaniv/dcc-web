# DCC Web

Dungeon Crawl Classics session manager: character sheets, server dice, tactical maps.

## How it runs

**nginx (Docker)** → proxies to **Node API** and **Vite** on your machine. **Postgres (Docker)** for data.

Same layout for daily dev and production-like runs — see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

```bash
cp .env.example .env
bun install
bun run stack
bun run db:migrate
```

In **two terminals**: `bun server` and `bun bundler`. Open **http://localhost:8080**

## Scripts

| Script | What |
|--------|------|
| `bun run dev` | Docker stack + API watch + Vite HMR |
| `bun run prod` / `bun run start` | Build once + Docker stack + API + Vite preview |
| `bun run start:server` | API only (after `bun run build`) |
| `bun run start:bundler` | Vite preview only (after `bun run build`) |
| `bun run stack` | Postgres + nginx only |
| `bun run build` | Compile shared, API, web |

## Docs

- [Development / structure](docs/DEVELOPMENT.md)
- [Production deployment (hat3d.com)](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
