# ADR-003: Realtime single-instance vs multi-instance

## Status

Accepted (2025-06-17)

## Context

Socket.IO game rooms, presence tracking, and the membership LRU cache live in the API process memory. Running multiple API replicas without a shared adapter would split clients across isolated room sets and break realtime sync.

## Decision

**Default to single-instance realtime** for production (`REALTIME_MODE=single-instance`):

- One API process behind nginx on hat3d.com.
- Startup banner and `/health` field `realtimeMode` document the constraint.
- `docs/DEPLOYMENT.md` explains the limit.

**Defer multi-instance** until horizontal scaling is required:

- Add Redis to `docker-compose.yml`.
- Wire `@socket.io/redis-adapter` in `apps/api/src/index.ts`.
- Move `presenceByGame` and membership LRU to Redis.

## Consequences

- Safe, simple production deploy today with one API worker.
- Operators must not run multiple API processes without completing the Redis path.
- Audit log and health endpoints support operability without changing realtime architecture.
