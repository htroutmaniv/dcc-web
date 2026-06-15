# ADR-005: Map image storage

## Status

Accepted (2025-06-17) — local FS for single-instance; object storage deferred.

## Context

DMs upload map images (PNG/WebP). Files must be validated (magic bytes, size cap), stored durably, and served back via URL. Production runs a **single API process** behind nginx (ADR-003).

## Decision

### Current (single-instance)

- Store files on **local disk** under `STORAGE_PATH/maps/` (default `./data/uploads/maps`).
- Filename = content hash (`{mapId}-{sha256}.{ext}`) for deduplication.
- Public URL prefix `/uploads/maps/` served by the API.
- Paths centralized in `apps/api/src/lib/storage-paths.ts`.
- Daily retention job deletes orphan files not referenced by any `GameMap.imageUrl`.

### Future (multi-instance)

When running multiple API workers (ADR-003 scaling path), local disk is **not shared**. Migrate to:

- S3-compatible object storage (AWS S3, MinIO), or
- NFS/shared volume (simpler but weaker for cloud deploys)

Signed URLs with TTL optional for direct browser fetch; nginx can continue proxying if needed.

## Alternatives considered

1. **S3 from day one** — rejected: adds ops burden before multi-instance need.
2. **Base64 in Postgres** — rejected: bloats DB and backups.

## Consequences

- Single API server: map uploads work today with no extra infra.
- Do not scale API horizontally without addressing storage (same constraint as Redis for sockets).
- `REALTIME_MODE=redis` future work should include ADR-005 object storage in the same milestone.
