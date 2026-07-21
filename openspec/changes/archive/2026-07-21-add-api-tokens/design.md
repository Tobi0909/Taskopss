## Context

`AuthModule` (`backend/src/auth/auth.module.ts`) registers `JwtAccessStrategy` and `JwtRefreshStrategy` via `PassportStrategy`. `JwtAuthGuard` (`backend/src/common/guards/jwt-auth.guard.ts`) wraps `AuthGuard('jwt-access')` and is registered globally as `APP_GUARD`, with `@Public()` as the escape hatch. `JwtAccessStrategy.validate()` returns `AuthenticatedUser = { id, role }`, which is what `RolesGuard` and `@CurrentUser()` rely on. The CLI stores `accessToken`/`refreshToken`/`user` in `~/.config/taskops-cli/config.json`.

## Goals / Non-Goals

**Goals:**
- Long-lived, revocable, named credentials that don't require interactive login or cookie storage.
- Reuse the existing `AuthenticatedUser` contract so every downstream guard/decorator works unchanged regardless of which strategy authenticated the request.

**Non-Goals:**
- Not building scoped/granular permissions per token (e.g. "read-only token") in this pass — a token authenticates as the user, with that user's existing role. Scoping can be a later addition on top of the `ApiToken` model.
- Not replacing JWT for the web frontend — tokens are for CLI/script/service use.

## Decisions

- **Token format**: `tok_<43-char base64url random>` (32 random bytes). The `tok_` prefix makes it easy to (a) visually distinguish from JWTs in logs and (b) route requests to the right strategy without parsing.
- **Storage**: store `sha256(token)` (hex) in `tokenHash`, not the plaintext and not bcrypt — bcrypt is intentionally slow and non-deterministic per call, which would make lookup-by-token an unindexed full-table bcrypt-compare scan. SHA-256 is deterministic so `tokenHash` can be a unique indexed column; the token itself already has 256 bits of entropy so a fast hash is fine (this is a bearer secret, not a password).
- **Strategy dispatch**: `JwtAuthGuard extends AuthGuard(['jwt-access', 'api-token'])`. Passport tries strategies in order and succeeds on the first that validates; `api-token` strategy immediately rejects anything not matching `/^tok_/`, so JWTs never pay the DB-lookup cost of the token strategy and vice versa.
- **`ApiTokenStrategy`** implemented with `passport-custom` (or a manual `PassportStrategy(Strategy)` subclass) rather than `passport-http-bearer`, since we need conditional pass-through (reject fast on non-`tok_` prefix) and custom hashing logic.
- **Show-once semantics**: `POST /users/me/tokens` returns `{ id, name, token }` where `token` is the only time the plaintext is ever returned; `GET /users/me/tokens` returns `{ id, name, createdAt, lastUsedAt, expiresAt }[]` only.
- **Revocation**: `DELETE /users/me/tokens/:id` sets `revokedAt`; the strategy checks `revokedAt IS NULL` and (if set) `expiresAt > now()` on every request.
- **`lastUsedAt` update**: fire-and-forget update (not awaited in the request path) to avoid adding write latency to every authenticated request.

## Risks / Trade-offs

- [Risk] Token leaked in logs/CI output grants full account access indefinitely → Mitigation: support optional `expiresAt` at creation time; document that tokens should be scoped to the shortest practical lifetime; revocation endpoint makes rotation easy.
- [Risk] Adding a second strategy to the auth guard chain increases per-request overhead for token-authenticated requests (extra DB lookup vs JWT's stateless verify) → Mitigation: acceptable — token auth is for CLI/scripts, not high-frequency browser traffic; prefix check makes the common JWT path unaffected.
- [Risk] Losing a token at creation time (client didn't record it) means the user must revoke and recreate → Mitigation: expected behavior for bearer tokens generally (e.g. GitHub PATs behave the same way); no recovery mechanism needed since only the hash is stored.
