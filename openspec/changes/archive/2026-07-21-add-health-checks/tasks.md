## 1. Dependencies

- [x] 1.1 Add `@nestjs/terminus` to `backend/package.json` and install

## 2. Health module

- [x] 2.1 Create `backend/src/health/health.module.ts` importing `TerminusModule` and `PrismaModule`
- [x] 2.2 Create `backend/src/health/health.controller.ts` with `@Public()` on all routes
- [x] 2.3 Implement `GET /live` returning `{ status: "ok" }` with no checks
- [x] 2.4 Implement a Prisma DB indicator function (`SELECT 1` via `prisma.$queryRaw`, throwing `HealthCheckError` on failure)
- [x] 2.5 Implement `GET /ready` using `HealthCheckService.check([dbIndicator])`
- [x] 2.6 Implement `GET /health` alias that delegates to the same ready check logic
- [x] 2.7 Register `HealthModule` in `backend/src/app.module.ts`
- [x] 2.8 Remove the old ad-hoc `health()` handler from `backend/src/app.controller.ts` (superseded by HealthModule; `AppController` was deleted entirely since it had no remaining routes)

## 3. Docker wiring

- [x] 3.1 Add `HEALTHCHECK` instruction to `backend/Dockerfile` polling `/api/ready` (via a `node -e` HTTP check, since the slim base image has no curl/wget) with a `start_period` grace window
- [x] 3.2 `docker-compose.yml`: `frontend`'s `depends_on` now waits on `backend: condition: service_healthy`, which uses the Dockerfile's built-in `HEALTHCHECK` (no separate compose-level healthcheck block needed since the image already declares one)

## 4. Verification

- [x] 4.1 Started the backend locally against a real (temporary) Postgres instance and curled `/api/live`, `/api/ready`, `/api/health` — all returned HTTP 200 with expected bodies
- [x] 4.2 Stopped the DB and confirmed `/api/ready` and `/api/health` returned HTTP 503 with error detail, while `/api/live` still returned HTTP 200
- [ ] 4.3 `docker compose up` end-to-end check — **not run**: this sandbox has no Docker available. Recommend the user run `docker compose up` once to confirm `docker compose ps` shows the backend healthy.
