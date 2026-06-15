# Architecture Decision Records

Index of recorded decisions for DCC Web. ADRs capture **why** the codebase looks the way it does; `plan.md` tracks **when** work landed.

| ADR | Title | Status |
|-----|-------|--------|
| [001](./001-game-state-storage.md) | Game state storage: tables + JSON + optimistic locking | Accepted |
| [002](./002-auth-session-csrf.md) | Auth: email + JWT cookie, dev-login, CSRF posture | Accepted |
| [003](./003-realtime-single-instance.md) | Realtime: single instance vs Redis adapter | Accepted |
| [004](./004-client-data-layer.md) | Client data layer: hooks vs TanStack Query | Accepted |
| [005](./005-map-image-storage.md) | Map images: local FS vs object storage | Accepted |

When adding an ADR, use the next number, link it here, and reference it from `plan.md` where relevant.
