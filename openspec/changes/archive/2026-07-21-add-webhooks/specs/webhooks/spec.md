## ADDED Requirements

### Requirement: Webhook subscription management
The system SHALL let a global admin create, list, update, and delete webhook subscriptions, each specifying a target URL and a set of subscribed event types.

#### Scenario: Create a webhook
- **WHEN** a global admin sends `POST /webhooks` with `{ url, eventTypes: ["TASK_CREATED"] }`
- **THEN** the system creates the webhook, generates a secret, and responds with HTTP 201 including the secret exactly once

#### Scenario: Reject non-HTTP(S) or internal-looking URLs
- **WHEN** a global admin sends `POST /webhooks` with a `url` that is not `http`/`https`, or resolves to a loopback/private address
- **THEN** the system responds with HTTP 400 and does not create the webhook

#### Scenario: Non-admin cannot manage webhooks
- **WHEN** a non-admin user sends `POST /webhooks`, `PATCH /webhooks/:id`, or `DELETE /webhooks/:id`
- **THEN** the system responds with HTTP 403

### Requirement: Signed event delivery
The system SHALL, for every active webhook subscribed to an event type, deliver a JSON POST to that webhook's URL when that event type occurs, including an `X-Taskops-Signature` header computed as an HMAC-SHA256 of the raw request body using the webhook's secret.

#### Scenario: Task creation triggers delivery
- **WHEN** a task is created and an active webhook is subscribed to `TASK_CREATED`
- **THEN** the system sends an HTTP POST to that webhook's URL with a body describing the created task and a valid `X-Taskops-Signature` header

#### Scenario: Inactive webhook receives nothing
- **WHEN** a webhook's `isActive` is `false` and its subscribed event type occurs
- **THEN** the system does not attempt delivery to that webhook

### Requirement: Bounded retry on delivery failure
The system SHALL retry a failed delivery (non-2xx response or network error) up to 5 times with increasing backoff, then stop and record the delivery as failed.

#### Scenario: Receiver eventually succeeds
- **WHEN** a webhook's endpoint returns a 500 on the first attempt and a 200 on the second retry
- **THEN** the system records both attempts and marks the delivery successful after the second

#### Scenario: Receiver never succeeds
- **WHEN** a webhook's endpoint returns a non-2xx response on all 5 attempts
- **THEN** the system stops retrying after the 5th attempt and marks the delivery as failed

### Requirement: Delivery history
The system SHALL record every delivery attempt (event type, payload, response status, success flag, attempt number, timestamp) and expose it via `GET /webhooks/:id/deliveries`, restricted to global admins.

#### Scenario: Admin inspects delivery history
- **WHEN** a global admin sends `GET /webhooks/:id/deliveries`
- **THEN** the system responds with HTTP 200 and a list of delivery attempts for that webhook, ordered most recent first
