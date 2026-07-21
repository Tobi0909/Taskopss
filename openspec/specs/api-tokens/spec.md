# api-tokens Specification

## Purpose
TBD - created by archiving change add-api-tokens. Update Purpose after archive.
## Requirements
### Requirement: Token creation shows plaintext once
The system SHALL let an authenticated user create a named API token via `POST /users/me/tokens`, returning the plaintext token in that response only, and SHALL never return or store the plaintext afterward.

#### Scenario: Successful creation
- **WHEN** an authenticated user sends `POST /users/me/tokens` with `{ name: "laptop-cli" }`
- **THEN** the system responds with HTTP 201 containing `{ id, name, token }` where `token` starts with `tok_`

#### Scenario: Listing never exposes the plaintext
- **WHEN** an authenticated user sends `GET /users/me/tokens`
- **THEN** the system responds with a list of `{ id, name, createdAt, lastUsedAt, expiresAt }` objects, none of which contain a `token` field

### Requirement: Token authenticates as its owning user
The system SHALL accept `Authorization: Bearer tok_<...>` on any endpoint that accepts JWT bearer auth, resolving the request's authenticated user and role to the token's owner, exactly as a JWT would.

#### Scenario: Token-authenticated request
- **WHEN** a request includes `Authorization: Bearer tok_<valid token>` for an active, unrevoked, unexpired token
- **THEN** the system treats the request as authenticated by the token's owning user, with that user's role, for the purposes of all existing role/permission guards

#### Scenario: Revoked token rejected
- **WHEN** a request includes `Authorization: Bearer tok_<revoked token>`
- **THEN** the system responds with HTTP 401

#### Scenario: Expired token rejected
- **WHEN** a request includes `Authorization: Bearer tok_<token>` whose `expiresAt` is in the past
- **THEN** the system responds with HTTP 401

### Requirement: Token revocation
The system SHALL let a user revoke their own API token via `DELETE /users/me/tokens/:id`, after which the token SHALL no longer authenticate any request.

#### Scenario: Revoke own token
- **WHEN** an authenticated user sends `DELETE /users/me/tokens/:id` for a token they own
- **THEN** the system marks the token revoked and responds with HTTP 200, and subsequent requests using that token receive HTTP 401

#### Scenario: Cannot revoke another user's token
- **WHEN** an authenticated user sends `DELETE /users/me/tokens/:id` for a token owned by a different user
- **THEN** the system responds with HTTP 404

