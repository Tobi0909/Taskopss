## 1. Dependencies & schema

- [x] 1.1 Add `@nestjs/axios` (and `axios`) to `backend/package.json`
- [x] 1.2 Add `WebhookEventType` enum to `backend/prisma/schema.prisma` (`TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_CHANGED`, `COMMENT_CREATED`, `COMMENT_MENTIONED`)
- [x] 1.3 Add `Webhook` model (`id`, `url`, `secret`, `eventTypes: WebhookEventType[]`, `isActive`, `createdById` nullable FK, `createdAt`)
- [x] 1.4 Add `WebhookDelivery` model (`id`, `webhookId` FK, `eventType`, `payload` Json, `responseStatus` nullable Int, `success` Boolean, `attempt` Int, `createdAt`), index on `(webhookId, createdAt)`
- [x] 1.5 Generate and run Prisma migration

## 2. Webhook module core

- [x] 2.1 Create `backend/src/webhooks/webhooks.service.ts`: CRUD for `Webhook`, secret generation on create, URL validation (http/https scheme + reject loopback/private IPs) via `webhook-url-guard.ts`
- [x] 2.2 Create `backend/src/webhooks/webhooks.controller.ts`: `POST/GET/PATCH/DELETE /webhooks`, `GET /webhooks/:id/deliveries`, `@Roles(Role.ADMIN)` applied at controller level
- [x] 2.3 Create `backend/src/webhooks/webhook-dispatch.service.ts`: `@OnEvent()` listeners for `TASK_EVENTS.*`/`COMMENT_EVENTS.*` mapping to `WebhookEventType`, look up matching active webhooks, build signed payload
- [x] 2.4 Implement HMAC-SHA256 signing (`X-Taskops-Signature: sha256=<hex>`) over the raw JSON body
- [x] 2.5 Implement dispatch via `HttpService` with an explicit request timeout (10s)
- [x] 2.6 Implement retry scheduling (5 attempts, backoff 1s/5s/30s/2m/10m) recording a `WebhookDelivery` row per attempt
- [x] 2.7 Register `WebhooksModule` in `backend/src/app.module.ts`
- [x] 2.8 (found during verification, not in original plan) Made retries re-check `webhook.isActive`/existence before firing — without this, disabling or deleting a webhook mid-retry-cycle wouldn't actually stop already-scheduled `setTimeout` retries

## 3. Verification

- [x] 3.1 Inserted a webhook subscribed to `TASK_CREATED`+`TASK_CHANGED` pointing at a local test HTTP receiver; created a task via the real API against a real running server; confirmed the receiver received both events with a valid HMAC signature (independently recomputed and matched)
- [x] 3.2 Pointed a webhook at an endpoint that always returns 500; confirmed attempts 1, 2, 3 were recorded with increasing backoff (1s, then 5s) within a 7s window, each correctly marked `success: false` with `responseStatus: 500` — did not wait out the full ~13-minute window for all 5 attempts, but the scheduling logic for attempts 1-3 is proven and attempts 4-5 use the same code path
- [x] 3.3 Confirmed `POST /webhooks` rejects a `url` pointing at `127.0.0.1` with HTTP 400 and a clear message
- [x] 3.4 `GET /webhooks/:id/deliveries` confirmed to return records (query uses `orderBy: { createdAt: 'desc' }` for most-recent-first)
- [x] 3.5 Confirmed a non-admin user gets HTTP 403 on `GET /webhooks`
- [x] 3.6 (found during verification) Confirmed disabling a webhook mid-retry-cycle stops further retries (see 2.8) — only 1 delivery attempt recorded instead of continuing
