# Runtime & repo structure

## Your model (adopted)

1. **Node backend** always runs on the host (watch in dev, `node dist` after `bun run start`).
2. **Frontend** always runs on the host as **Vite** (dev server or preview) — not embedded in nginx.
3. **nginx in Docker** is only the **front door**: `/` → Vite, `/api` → Node.
4. **One workflow** — `start` vs dev differ only in hot-reload vs built assets, not in topology.
5. **Separate processes** — `bun server` (API watch) and `bun bundler` (Vite) in different terminals so reloads stay isolated.

That is reasonable and common for small teams: simple mental model, one origin for cookies and OAuth, no “works on 5173 but not 8080” surprises.

## Repo map

```
apps/api/       → authoritative game logic, DB, dice, auth
apps/web/       → React UI (lobby + game session)
packages/shared → shared validators & dice/movement helpers
nginx/          → proxy config only (no app build)
docker-compose  → postgres + nginx
```

## What we removed

- Baking `apps/web/dist` into the nginx image.
- Running the API inside Docker for daily work (`docker-compose.prod.yml`).
- Treating “open Vite on :5173” as the primary dev path (optional fallback only).

## Prod on a real server

Same processes, typically managed by systemd/pm2 or a process manager:

1. `docker compose up -d` (nginx + postgres)
2. `bun run start` (or build in CI, run `node` + `vite preview` on the host)

Later you can swap `vite preview` for serving `dist` via nginx **only if** you want static files without a Node frontend process — that would be a deliberate second phase, not required for your unified workflow today.
