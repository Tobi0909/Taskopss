## Context

Current `GET /api/health` (`backend/src/app.controller.ts`) runs `SELECT 1` against Postgres via Prisma and returns `{ status, timestamp }`. It's marked `@Public()`. There's no readiness/liveness split, no `@nestjs/terminus`, and no Docker `HEALTHCHECK` on the backend container — `docker-compose.yml` only healthchecks the `db` service.

## Goals / Non-Goals

**Goals:**
- Distinguish liveness (process up) from readiness (can serve traffic — DB reachable).
- Use `@nestjs/terminus` so future checks (Redis, disk, external APIs) plug in with minimal code.
- Wire the new endpoint into Docker so containers report unhealthy correctly.

**Non-Goals:**
- No dependency other than Postgres exists yet, so readiness checks only DB for now.
- Not adding Kubernetes manifests (repo doesn't have any yet) — just Docker Compose + Dockerfile.

## Decisions

- **Use `@nestjs/terminus`** over hand-rolled checks: it's the standard NestJS health-check module, gives consistent JSON shape (`{ status, info, error, details }`), and supports `PrismaHealthIndicator`-style custom indicators via `HealthIndicatorFunction`.
- **Routes**: `GET /api/live` (no checks, just confirms the process handles HTTP — used for restart decisions), `GET /api/ready` (runs DB check — used for traffic-routing decisions), `GET /api/health` kept as an alias calling the same logic as `/ready` for backward compatibility with anything already polling it.
- **Module placement**: new `backend/src/health/health.module.ts` + `health.controller.ts` rather than growing `app.controller.ts`, since terminus checks are a distinct concern from the root controller.
- **Custom DB indicator**: implement via `HealthCheckService.check([...])` with a small function that runs `prisma.$queryRaw\`SELECT 1\`` and throws `HealthCheckError` on failure, rather than pulling in `@nestjs/terminus`'s TypeORM indicator (project uses Prisma, not TypeORM).

## Risks / Trade-offs

- [Risk] Docker `HEALTHCHECK` marking container unhealthy during slow startup (migrations running) → Mitigation: use `start_period` in the Dockerfile/Compose healthcheck to grace-period the first checks.
- [Risk] `/api/health` alias behavior diverges from `/api/ready` later if someone edits one and not the other → Mitigation: alias route calls the same service method, not duplicated logic.
