# ADR-002: Auth, session cookie, and CSRF posture

## Status

Accepted (2025-06-17) — reflects Phase 1 implementation; CSRF hardening deferred.

## Context

The app is a same-origin SPA: nginx serves the web UI and proxies `/api` and `/socket.io` to one host. Users authenticate with email/password; Resend sends verification and password-reset links in production.

## Decision

### Authentication

- **Production:** Email + password (argon2id), email verification required before login, Resend for transactional mail.
- **Session:** JWT stored in an **httpOnly** cookie (`dcc_session` by default), not localStorage.
- **Cookie flags:** `SameSite=Lax`, `Secure` in production, 7-day `maxAge`.
- **WebSocket:** Same cookie parsed on handshake (`getUserIdFromSocketCookie`); no separate WS token.

### Dev login

- `POST /auth/dev-login` creates fixed DM/player test accounts.
- **Disabled in production** unless `ENABLE_DEV_LOGIN=true` (explicit opt-in for staging).

### CSRF (deferred)

Current posture: **SameSite=Lax** + same-site API (`https://hat3d.com/api/...`) is sufficient for cookie-authenticated JSON from our own SPA. Cross-site POSTs with cookies are not sent on cross-origin navigations; state-changing routes use `Content-Type: application/json` from our client.

**Not implemented yet:** double-submit CSRF token (`@fastify/csrf-protection` + `X-CSRF-Token` header). Revisit if we embed the app in third-party origins or add form POST endpoints that accept `application/x-www-form-urlencoded`.

### Authorization

- Game access: `requireMember` / `requireDm` decorators; DM = `games.dm_user_id` only (see co-DM note in ARCHITECTURE.md).

## Alternatives considered

1. **Bearer token in memory + refresh** — rejected for VTT use case: httpOnly cookie is simpler and works with page reloads.
2. **SameSite=Strict** — rejected: breaks email verification links that land on `/` then call API.
3. **Immediate CSRF tokens** — deferred: no cross-origin form integration today.

## Consequences

- Production must set strong `JWT_SECRET`, verified Resend domain, and `PUBLIC_URL`.
- Plan item 1.3 (CSRF) remains optional until auth surface expands.
- Operators must not expose dev-login in public production.
