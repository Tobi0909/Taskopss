## Why

The backend has a single ad-hoc `GET /health` endpoint (`app.controller.ts`) that only checks DB connectivity and conflates liveness with readiness. There's no `/ready` distinction, no Docker `HEALTHCHECK` on the backend container, and no standardized check infrastructure — so orchestrators (Docker Compose, future k8s) can't tell "process is up" apart from "process can serve traffic (DB reachable)".

## What Changes

- Add `@nestjs/terminus` for standardized health check infrastructure.
- Add `GET /api/live` (liveness: process is running, no dependency checks) and `GET /api/ready` (readiness: DB — and any other hard dependency — reachable).
- Keep `GET /api/health` as an alias of the readiness check for backward compatibility with existing monitoring/CLI usage.
- Add a `HEALTHCHECK` instruction to `backend/Dockerfile` pointing at `/api/ready`.
- Add a backend healthcheck block to `docker-compose.yml` so `depends_on` conditions can target it.

## Capabilities

### New Capabilities
- `health-check`: liveness and readiness endpoints for the backend service, used by container orchestration and monitoring.

### Modified Capabilities
(none — no existing spec covers this today)

## Impact

- `backend/src/app.controller.ts` (or new `backend/src/health/health.module.ts`): new/changed routes.
- `backend/package.json`: new dependency `@nestjs/terminus`.
- `backend/Dockerfile`: add `HEALTHCHECK`.
- `docker-compose.yml`: add backend healthcheck block.
- No breaking changes; `/api/health` behavior is preserved.
