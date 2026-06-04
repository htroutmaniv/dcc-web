# DCC Web — Session Character & Battle Map Manager

Web application for **Dungeon Crawl Classics** (and compatible) tabletop play: shared sessions where the DM sees all player character sheets, players see only their own, with tactical maps, token placement, and movement visualization.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, MUI (theming) |
| API | Node.js, TypeScript (Fastify recommended) |
| Real-time | WebSockets (Socket.IO or native `ws`) |
| Reverse proxy | nginx |
| Shared types | `packages/shared` workspace package |

## Repository layout

```
dcc_web/
├── apps/
│   ├── api/          # REST + WebSocket server
│   └── web/          # React SPA
├── packages/
│   └── shared/       # DTOs, Zod schemas, constants
├── nginx/            # Production reverse-proxy config
└── docs/             # Architecture & domain design
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, flows, deployment
- [Data model](docs/DATA-MODEL.md) — entities and permissions
- [Purple Sorcerer](docs/PURPLE-SORCERER.md) — import strategy (no public API)

## Status

**Skeleton** — API, web shell, PostgreSQL schema, Docker (nginx + api + postgres). UI flows are minimal; expand per [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) phases.

## Quick start

### Docker (nginx on port 80)

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost — use **Dev login** until Discord app credentials are set.

### Local development

```bash
npm install
npm run build -w @dcc-web/shared
# Start Postgres (or use docker compose up postgres -d)
export DATABASE_URL=postgresql://dcc:dcc@localhost:5432/dcc
npm run db:migrate -w @dcc-web/api
npm run dev
```

Web: http://localhost:5173 (proxies `/api` to API). API: http://localhost:3001.

### Discord login

See [docs/DISCORD-AUTH.md](docs/DISCORD-AUTH.md). Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and register redirect `http://localhost/api/auth/discord/callback`.

## License

TBD — ensure compliance with Goodman Games / Purple Sorcerer terms if distributing generated content or importers.
