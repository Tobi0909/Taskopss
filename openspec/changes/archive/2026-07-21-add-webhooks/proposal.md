## Why

`@nestjs/event-emitter` is already wired globally (`app.module.ts`) and domain events (`task.created`, `task.assigned`, `task.status_changed`, `task.changed`, `comment.created`, `comment.mentioned`) are already emitted and consumed internally by `NotificationsService` and `RealtimeGateway`. There is no way for anything *outside* the app (a Slack bot, a CI pipeline, a customer's own integration) to react to these events — the only integration points are the REST API (poll) and the internal WebSocket gateway (requires being a logged-in browser client). Webhooks are the standard way to let external systems subscribe to server-side events without polling.

## What Changes

- Add a `Webhook` subscription model: URL, subscribed event types, a signing secret, active/inactive state, owner.
- Add an outbound HTTP dispatch service that listens to the existing domain events (piggybacking on the already-emitted `TASK_EVENTS`/`COMMENT_EVENTS`) and POSTs a signed JSON payload to every active webhook subscribed to that event type.
- Sign every payload with HMAC-SHA256 (using the webhook's secret) in an `X-Taskops-Signature` header, so receivers can verify authenticity.
- Retry failed deliveries with backoff (bounded attempts), and record delivery attempts/outcomes for debugging.
- New endpoints: `POST /webhooks`, `GET /webhooks`, `PATCH /webhooks/:id`, `DELETE /webhooks/:id`, `GET /webhooks/:id/deliveries`.
- Add `axios` (or reuse Nest's built-in `HttpService` from `@nestjs/axios`) as the outbound HTTP client — not currently a dependency.

## Capabilities

### New Capabilities
- `webhooks`: subscription management and reliable, signed, outbound event delivery to external URLs.

### Modified Capabilities
(none — no existing spec covers outbound integrations)

## Impact

- `backend/prisma/schema.prisma`: new `Webhook` and `WebhookDelivery` models, new `WebhookEventType` enum.
- `backend/package.json`: new dependency `@nestjs/axios` (+ `axios`).
- `backend/src/webhooks/` (new module): service, controller, event listeners, dispatch/retry logic.
- `backend/src/tasks/tasks.events.ts`, `backend/src/comments/comments.events.ts`: no changes to event shapes, just an additional listener.
- Depends on `add-api-tokens` or global admin auth for who can manage webhooks (this change gates webhook management behind global `Role.ADMIN`, consistent with existing admin-only integration-style endpoints like tags/user management).
