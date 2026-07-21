## 1. Schema

- [x] 1.1 Add `ApiToken` model to `backend/prisma/schema.prisma` (`id`, `userId`, `name`, `tokenHash` unique, `lastUsedAt` nullable, `expiresAt` nullable, `revokedAt` nullable, `createdAt`)
- [x] 1.2 Generate and run Prisma migration

## 2. Token generation & strategy

- [x] 2.1 Create `backend/src/auth/api-token.service.ts`: `generatePlaintext()` (random 32 bytes → `tok_<base64url>`), `hash(token)` (sha256 hex), `verify(token)` (hash + lookup, check revoked/expired)
- [x] 2.2 Create `backend/src/auth/strategies/api-token.strategy.ts` using `passport-custom` (newly added dependency): rejects immediately if the credential doesn't start with `tok_`; otherwise hashes, looks up, checks revocation/expiry, returns `{ id, role }` of the owning user
- [x] 2.3 Register `ApiTokenStrategy` in `AuthModule`
- [x] 2.4 Update `backend/src/common/guards/jwt-auth.guard.ts` to extend `AuthGuard(['jwt-access', 'api-token'])` instead of `AuthGuard('jwt-access')`, keeping the existing `@Public()` bypass
- [x] 2.5 Fire-and-forget update of `lastUsedAt` on successful token auth

## 3. Management endpoints

- [x] 3.1 Add `POST /users/me/tokens` — create token, return plaintext once
- [x] 3.2 Add `GET /users/me/tokens` — list metadata only (no plaintext, no hash)
- [x] 3.3 Add `DELETE /users/me/tokens/:id` — revoke, scoped to the caller's own tokens (404 if not owner)

## 4. CLI support

- [x] 4.1 Added `TASKOPS_API_TOKEN` + `TASKOPS_API_URL` env var support in `cli/src/apiClient.ts` (chose env vars over a `--token` login flag — simpler for CI/script use, no local config file needed at all)
- [x] 4.2 When `TASKOPS_API_TOKEN` is set, `apiRequest()` sends it as the Bearer credential directly and skips `loadConfig()`/refresh-token flow entirely
- [x] 4.3 Documented the env-token flow in `cli/README.md`

## 5. Verification

- [x] 5.1 Created a token via API (real running server + real Postgres), confirmed it authenticates `GET /boards`, confirmed `GET /users/me/tokens` never returns the plaintext
- [x] 5.2 Revoked the token, confirmed subsequent requests with it return 401 with a clear error message; confirmed a garbage `tok_...` value is also rejected
- [x] 5.3 Confirmed existing JWT-based login (`/auth/login`) and `/auth/me` still work unaffected through the same multi-strategy guard
- [x] 5.4 Built the CLI and ran `taskops whoami` / `taskops boards list` with only `TASKOPS_API_TOKEN`/`TASKOPS_API_URL` set — no `taskops login` — both succeeded
