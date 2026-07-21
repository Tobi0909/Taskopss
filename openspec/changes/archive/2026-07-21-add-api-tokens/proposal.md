## Why

The only way to authenticate against the API today is the short-lived JWT access token issued by `POST /auth/login`, refreshed via an HttpOnly cookie (`backend/src/auth/strategies/jwt-access.strategy.ts`, `jwt-refresh.strategy.ts`). The CLI (`cli/src/apiClient.ts`) currently logs in interactively and stores a refresh token to auto-renew. There's no long-lived, revocable, non-interactive credential — which is what's actually needed for CI jobs, scripts, or headless CLI usage on a machine that shouldn't hold a user's password/refresh cookie indefinitely.

## What Changes

- Add a personal API token system: users generate named tokens (e.g. "laptop-cli", "ci-pipeline") from their account, each shown in full exactly once at creation.
- New `ApiToken` model storing a hash of the token, owning user, name, optional expiry, `lastUsedAt`, and revocation state.
- New passport strategy (`api-token`) that authenticates `Authorization: Bearer <token>` requests where the token isn't a JWT, resolving to the same `AuthenticatedUser` shape (`{ id, role }`) as the existing JWT strategy — so all existing `@Roles()`/guard logic keeps working unchanged for token-authenticated requests.
- `JwtAuthGuard` tries both `jwt-access` and `api-token` strategies (order: JWT first, since it's the common case).
- New endpoints: `POST /users/me/tokens` (create, returns plaintext token once), `GET /users/me/tokens` (list metadata only, never the token), `DELETE /users/me/tokens/:id` (revoke).
- CLI gets a `taskops login --token <token>` (or `TASKOPS_API_TOKEN` env var) path that skips the interactive login/refresh-cookie flow entirely.

## Capabilities

### New Capabilities
- `api-tokens`: creation, listing, revocation, and request-time authentication of personal API tokens.

### Modified Capabilities
(none — no existing spec covers authentication)

## Impact

- `backend/prisma/schema.prisma`: new `ApiToken` model.
- `backend/src/auth/`: new `ApiTokenStrategy`, `ApiTokenService` (generate/hash/verify), registration in `AuthModule`.
- `backend/src/common/guards/jwt-auth.guard.ts`: extend to try both strategies.
- `backend/src/users/` (or new `backend/src/auth/tokens` module): token management endpoints.
- `cli/src/config.ts`, `cli/src/apiClient.ts`, `cli/src/commands/`: token-based login path.
- No breaking changes to existing JWT-based auth.
