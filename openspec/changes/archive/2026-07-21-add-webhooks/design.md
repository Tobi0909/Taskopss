## Context

`@nestjs/event-emitter` (global, `app.module.ts`) already carries `TASK_EVENTS.*` and `COMMENT_EVENTS.*` payloads consumed by `NotificationsService` (`@OnEvent`) and `RealtimeGateway` (WebSocket broadcast). No HTTP client library is installed in `backend/package.json` today.

## Goals / Non-Goals

**Goals:**
- Let external systems subscribe to the same domain events already flowing through the internal event emitter, without touching event-producing code.
- Make deliveries verifiable (HMAC signature) and debuggable (delivery history, status, response code).
- Bound retry behavior so a dead endpoint doesn't queue unbounded work.

**Non-Goals:**
- Not building a generic event-bus/message-queue product — this is single-destination HTTP POST per webhook, matching what the app actually needs.
- Not adding a job queue library (BullMQ/Redis) in this pass — retries are handled with `setTimeout`-based backoff within the Nest process. If delivery volume grows enough to need a durable queue, that's a follow-up change.

## Decisions

- **`Webhook` model**: `{ id, url, secret, eventTypes: WebhookEventType[], isActive, createdById, createdAt }`. `eventTypes` as a Postgres array column (Prisma `WebhookEventType[]`) rather than a join table — a webhook subscribing to a fixed small set of event types doesn't need relational querying.
- **`WebhookEventType` enum** mirrors existing event names: `TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_CHANGED`, `COMMENT_CREATED`, `COMMENT_MENTIONED`. Kept as a separate enum (not reusing `ActivityAction`) since webhook subscribers care about a coarser, stable public event vocabulary, decoupled from internal activity-log detail.
- **Dispatch via `@OnEvent()` listeners**, same pattern as `NotificationsService`/`RealtimeGateway` — a new `WebhookDispatchService` listens to the same events, looks up active webhooks matching that event type, and enqueues an HTTP POST per match. This is additive and doesn't touch existing event producers.
- **HTTP client**: `@nestjs/axios`'s `HttpService` — it's the Nest-idiomatic wrapper (Observable-based, DI-friendly, easy to mock in tests) over `axios`, which the project doesn't have yet but is the standard choice.
- **Signing**: `X-Taskops-Signature: sha256=<hmac>` where the HMAC key is the webhook's `secret` and the message is the raw JSON body string — standard pattern (same shape as GitHub/Stripe webhook signatures), lets receivers verify without trusting network transport alone.
- **Delivery tracking**: `WebhookDelivery { id, webhookId, eventType, payload (Json), responseStatus, success, attempt, createdAt }`. One row per attempt (not per logical delivery) so retry history is visible in `GET /webhooks/:id/deliveries`.
- **Retry policy**: up to 5 attempts with exponential backoff (1s, 5s, 30s, 2m, 10m) scheduled via `setTimeout`, capped — no durable queue, so retries are lost on process restart. Acceptable for v1 given non-critical, best-effort nature of webhooks; documented as a known limitation.
- **Management access**: `POST/PATCH/DELETE /webhooks` gated by global `Role.ADMIN` (same pattern as tags/user management) — webhooks are an integration surface, not a per-board concern, so they don't need the board-level RBAC from `add-rbac-board-roles`.

## Risks / Trade-offs

- [Risk] In-process retry timers are lost on server restart/redeploy → Mitigation: acceptable for v1; document it; a future change can move dispatch to a durable queue (BullMQ) if reliability requirements increase.
- [Risk] A slow or hanging receiver URL could tie up event-loop time → Mitigation: set an explicit request timeout (e.g. 10s) on every dispatch call via `HttpService`'s axios config.
- [Risk] Secret stored in plaintext in the DB (needed to compute HMAC on each delivery) → Mitigation: same trust model as the DB already holding `passwordHash`/`tokenHash`; document that DB access implies webhook secret access, consistent with existing data sensitivity in this schema.
- [Risk] Malicious/misconfigured webhook URL could be used for SSRF against internal services → Mitigation: validate the URL is `http(s)` and not a private/loopback address at creation time (defense-in-depth against pointing a webhook at `localhost`/internal IPs).
