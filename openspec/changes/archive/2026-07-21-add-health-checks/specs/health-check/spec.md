## ADDED Requirements

### Requirement: Liveness endpoint
The system SHALL expose `GET /api/live` that returns HTTP 200 with `{ status: "ok" }` whenever the process is running and able to handle HTTP requests, without checking any external dependency.

#### Scenario: Process is running
- **WHEN** a client sends `GET /api/live`
- **THEN** the server responds with HTTP 200 and `{ status: "ok" }` without querying the database

### Requirement: Readiness endpoint
The system SHALL expose `GET /api/ready` that returns HTTP 200 when the database is reachable, and HTTP 503 with error details when it is not.

#### Scenario: Database reachable
- **WHEN** a client sends `GET /api/ready` and the database responds to `SELECT 1`
- **THEN** the server responds with HTTP 200 and a body indicating the `database` check is `up`

#### Scenario: Database unreachable
- **WHEN** a client sends `GET /api/ready` and the database connection fails or times out
- **THEN** the server responds with HTTP 503 and a body indicating the `database` check is `down`, including the error reason

### Requirement: Backward-compatible health alias
The system SHALL keep `GET /api/health` available and SHALL return the same result and status code as `GET /api/ready`.

#### Scenario: Existing monitoring keeps working
- **WHEN** a client sends `GET /api/health`
- **THEN** the response matches what `GET /api/ready` would return for the same system state

### Requirement: Container-level health reporting
The system SHALL declare a Docker `HEALTHCHECK` on the backend container that polls `GET /api/ready`, so `docker compose ps` and `depends_on: service_healthy` reflect real readiness.

#### Scenario: Backend container reports unhealthy
- **WHEN** the backend process is running but the database is unreachable for longer than the configured retries
- **THEN** `docker inspect` reports the backend container status as `unhealthy`
