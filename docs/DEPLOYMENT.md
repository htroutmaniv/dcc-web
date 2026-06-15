# Production deployment (hat3d.com)

This app runs as **host processes** (API + static web) behind **Docker nginx + Postgres**. Docker nginx terminates TLS and proxies to the API and web on the host.

## Architecture

```text
Internet → hat3d.com:443 (Docker nginx, Let's Encrypt certs)
         → host:3003 (API) + host:5173 (vite preview / built web)
         → Postgres in Docker (127.0.0.1:5432 only)
```

Local dev uses **HTTP on port 8080** instead (`NGINX_TLS=false`).

The app is always opened at **https://hat3d.com** in production — not at raw ports 3003 or 5173.

## 1. DNS

Point your domain at this machine:

| Type | Name | Value |
|------|------|--------|
| A | `@` | Your server public IP |
| A | `www` | (optional) same IP |

## 2. Docker nginx + TLS

Production nginx listens on **80** (redirect to HTTPS) and **443** (TLS). Mount your existing Let's Encrypt directory into the container.

In `.env`:

```env
NGINX_TLS=true
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
NGINX_SERVER_NAME=hat3d.com www.hat3d.com
LETSENCRYPT_DIR=D:/Work/docker/letsencrypt
```

Cert paths inside the container default to:

- `/etc/letsencrypt/live/hat3d.com/fullchain.pem`
- `/etc/letsencrypt/live/hat3d.com/privkey.pem`

Override with `NGINX_SSL_CERT` / `NGINX_SSL_KEY` if your layout differs.

**Important:** Stop any other container or service bound to ports **80** or **443** (e.g. a separate nginx-certbot stack) before starting this one.

Build and start:

```bash
docker compose build nginx
docker compose up -d
```

Router/firewall must forward **80** and **443** to this machine.

## 3. Environment

Use **two layers** (see `.env.example` and `.env.production.example`):

1. **`.env`** — secrets only (`POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`)
2. **`.env.production`** — production profile (`PUBLIC_URL`, `NGINX_TLS`, `LETSENCRYPT_DIR`, etc.)

```bash
bun scripts/ensure-env.ts   # creates missing files from *.example templates
# Edit .env and .env.production with real secrets and paths
```

| Variable | Where |
|----------|--------|
| `JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY` | `.env` |
| `PUBLIC_URL`, `CORS_ORIGIN`, `NGINX_TLS`, `LETSENCRYPT_DIR` | `.env.production` |

`bun run prod` loads both files and recreates nginx with the production profile. You do **not** need to flip flags in a single `.env` when switching back to dev — use `bun run stack` (development profile) instead.

Leave `ENABLE_DEV_LOGIN` unset in production so dev accounts are disabled.

## 4. Resend (email verification)

Sign-up uses **email + password**. New accounts must verify via a link sent by [Resend](https://resend.com) before they can sign in.

### 4.1 Verify `hat3d.com` in Resend

1. [Resend dashboard](https://resend.com/domains) → **Add domain** → `hat3d.com`
2. Resend shows DNS records (SPF, DKIM, and optionally a return-path subdomain). Add them in **GoDaddy** (or your DNS host) exactly as shown.
3. Wait until Resend marks the domain **Verified** (can take a few minutes after DNS propagates).

You do **not** need to change MX records for outbound transactional mail.

### 4.2 API key and sender

1. Resend → **API Keys** → create a key with **Sending access**
2. In production `.env`:

```env
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM=noreply@hat3d.com
```

`MAIL_FROM` must use an address on the verified domain (e.g. `noreply@hat3d.com`).

Restart the API after changing these variables.

### 4.3 Auth flow (what users see)

| Step | What happens |
|------|----------------|
| Create account | `POST /api/auth/register` — password stored (argon2id), verification email sent |
| Email link | `GET /api/auth/verify-email?token=…` — marks email verified, sets session cookie, redirects to `/?auth_success=1` |
| Sign in | `POST /api/auth/login` — only works after verification |
| Resend | **Resend verification email** on the home page if the link expired (24h) |

Verification links use `PUBLIC_URL` (must be `https://hat3d.com` in production). Example:

`https://hat3d.com/api/auth/verify-email?token=…`

When both `RESEND_API_KEY` and `MAIL_FROM` are set, `/api/auth/config` returns `emailAuth: true` and the home page shows **Sign in / Create account** instead of dev login buttons.

### 4.4 Smoke test

1. Open **https://hat3d.com** — you should see email sign-in (not Dev DM / Dev Player)
2. Create an account with a real inbox you control
3. Open the verification email and click the link — you should land on the home page signed in
4. Sign out, sign in again with the same password

If email does not arrive, check API logs for `Failed to send verification email` and the Resend dashboard **Logs** tab.

## 5. Database

```bash
bun scripts/ensure-env.ts
bun install
docker compose build nginx
bun run stack:prod
bun run db:migrate:prod
bun run db:seed
```

Postgres is bound to **127.0.0.1:5432** only (not exposed on all interfaces).

## 6. Build and run

**Option A — one command** (builds once, starts API + web together):

```bash
bun run prod
```

(No need to set `NODE_ENV` manually — the production profile sets it.)

**Option B — separate terminals** (after a single build):

```bash
bun run build
docker compose up -d

# Terminal 1 — API
NODE_ENV=production bun run start:server

# Terminal 2 — vite preview
NODE_ENV=production bun run start:bundler
```

Run each start script **once** — API uses port 3003, web uses 5173.

Smoke test:

1. Open **https://hat3d.com**
2. `https://hat3d.com/api/health` → includes `status`, `db`, `socket`, `version`, `gitSha`, `realtimeMode`
3. `https://hat3d.com/api/ready` → `{ "status": "ready", "db": "ok" }` (503 if Postgres unreachable)
4. Create a game — presence and sockets should work

## 7. Firewall

| Port | Exposure |
|------|----------|
| 443 | Public (HTTPS) |
| 80 | Public (redirect to HTTPS) |
| 3003, 5173 | **Localhost only** (API + web) |
| 5432 | **127.0.0.1 only** (Postgres) |

Do **not** publicly forward API or web ports — nginx on 443 is the only public entry.

## 8. Realtime / single-instance mode

The API defaults to **single-instance** realtime (`REALTIME_MODE=single-instance`):

- Socket.IO rooms and in-memory presence (`game-presence.ts`) are **process-local**.
- Run **one** API process behind nginx unless you implement the multi-instance path (Redis + `@socket.io/redis-adapter` — see `plan.md` Phase 5.1).

On startup the API logs a warning when single-instance mode is active. `/api/health` reports `realtimeMode`.

Optional build metadata env vars (set at deploy time):

| Variable | Purpose |
|----------|---------|
| `APP_VERSION` | Shown in `/health` (defaults to `@dcc-web/api` package version) |
| `GIT_SHA` | Git commit in `/health` (defaults to `dev`) |
| `REALTIME_MODE` | `single-instance` (default) or `redis` when multi-instance is wired |

## 9. systemd (optional)

See previous sections for `dcc-api.service` and `dcc-web.service` units pointing at `bun run start:server` and `start:bundler`.

## Checklist

- [ ] DNS A record → server IP
- [ ] `NGINX_TLS=true`, `LETSENCRYPT_DIR` set, ports 80/443 free
- [ ] `docker compose build nginx && docker compose up -d`
- [ ] `.env` with `NODE_ENV=production`, `PUBLIC_URL`, `JWT_SECRET`, DB URL
- [ ] Resend domain verified
- [ ] `bun run build` + migrate + seed
- [ ] API + vite preview running
- [ ] Dev login disabled

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| **hat3d.com won't load on the server PC** (hangs/timeouts) | Router **hairpin NAT** — your PC can't reach its own public IP. Add to `C:\Windows\System32\drivers\etc\hosts`: `127.0.0.1 hat3d.com www.hat3d.com` (or use another device on the internet to test). |
| Page very slow / huge JS download | Rebuild nginx (gzip enabled) and web (`bun run build`). Ensure `bun run prod` is running API + vite preview. |
| nginx container exits on start | Cert paths wrong — check `NGINX_SSL_CERT` / files under `LETSENCRYPT_DIR` |
| Port 443 already in use | Another nginx/IIS service — stop it or use one stack only |
| 502 Bad Gateway | API or vite preview not running on host |
| `DATABASE_URL must be set in production` | Add `DATABASE_URL` to `.env` (localhost/127.0.0.1 is fine — Postgres runs on the host loopback in this layout) |
| Socket.IO fails / sync drops | Rebuild nginx after template changes (`docker compose build nginx && docker compose up -d nginx`). Check browser console for `[game socket]` messages. API logs show `socket connected` / `socket disconnected`. |
| Session cookie not set | Use HTTPS; check `NODE_ENV=production` |
| Verification emails not sent | Resend domain + `RESEND_API_KEY` / `MAIL_FROM` |
