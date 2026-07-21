## 1. Fill existing per-task activity gaps

- [x] 1.1 `backend/src/attachments/attachments.service.ts`: writes `ActivityLog` (`ATTACHMENT_ADDED`/`ATTACHMENT_REMOVED`) — **already implemented before this change**, verified by reading the code; no edit needed
- [x] 1.2 `backend/src/checklist/checklist.service.ts`: writes `ActivityLog` (`CHECKLIST_ITEM_ADDED`/`CHECKLIST_ITEM_TOGGLED`/`CHECKLIST_ITEM_REMOVED`) — **already implemented before this change**, verified by reading the code; no edit needed. (The original proposal's premise that these were missing was based on a stale codebase scan — corrected here.)

## 2. Schema for system-wide audit log

- [x] 2.1 Add `AuditAction` enum to `backend/prisma/schema.prisma` (added `USER_DELETED` in addition to the originally planned values, since `UsersService.remove()` does a real hard delete, not just deactivation)
- [x] 2.2 Add `AuditLog` model (`id`, `actorId` nullable FK to User with `onDelete: SetNull`, `action`, `entityType`, `entityId` nullable, `metadata` Json default `{}`, `createdAt`), index on `(entityType, createdAt)` and on `actorId`
- [x] 2.3 Generate and run Prisma migration

## 3. Audit module

- [x] 3.1 Create `backend/src/audit/audit-log.service.ts` with `record(actorId, action, entityType, entityId, metadata?)` and a `query()` method for filtering
- [x] 3.2 Create `backend/src/audit/audit-log.controller.ts`: `GET /audit-logs` with `actorId`/`entityType`/`action`/`from`/`to`/`page` query params, `@Roles(Role.ADMIN)`
- [x] 3.3 Register `AuditModule` in `backend/src/app.module.ts` as `@Global()` (deviation: made it global like `PrismaModule` rather than importing it individually into every consuming module, since `AuditLogService` is needed across boards/users/auth modules)

## 4. Wire up call sites

- [x] 4.1 `backend/src/boards/boards.service.ts`: records `BOARD_CREATED` on create, `BOARD_DELETED` on delete
- [x] 4.2 `backend/src/users/users.service.ts`: records `USER_CREATED`, `USER_UPDATED` (always) + `USER_DEACTIVATED` (when `isActive` transitions to false) + `USER_DELETED` (hard delete)
- [x] 4.3 `backend/src/auth/auth.service.ts`: records `LOGIN_SUCCEEDED` and `LOGIN_FAILED` (both the "user not found" and "wrong password" branches), with attempted email in metadata, never the password
- [x] 4.4 `backend/src/auth/api-token.service.ts`: records `API_TOKEN_CREATED`/`API_TOKEN_REVOKED` (the `add-api-tokens` change had already landed by the time this was implemented)
- [x] 4.5 `backend/src/boards/boards.service.ts`: records `BOARD_MEMBER_ADDED`/`BOARD_MEMBER_ROLE_CHANGED`/`BOARD_MEMBER_REMOVED` (the `add-rbac-board-roles` change had already landed)

## 5. Verification

- [ ] 5.1 Upload/remove an attachment and toggle a checklist item to re-confirm `GET /tasks/:id/activity` — **not re-verified in this pass** since the underlying code was already covered by section 1's finding (pre-existing, unchanged)
- [x] 5.2 Ran against a real server + real Postgres: wrong-password login, correct login, board creation, and API token creation — all appeared correctly via `GET /audit-logs`, with correct actor/metadata (including the "user not found" `LOGIN_FAILED` case showing no actor, vs. the "wrong password" case showing the actor)
- [x] 5.3 Confirmed filtering by `entityType=Board` and `action=LOGIN_FAILED` returns the right subset
- [x] 5.4 Confirmed a non-admin user gets HTTP 403 from `GET /audit-logs`
