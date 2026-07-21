## Why

There is already a task-scoped `ActivityLog` model (`backend/prisma/schema.prisma:223-235`) with a 13-value `ActivityAction` enum that already *defines* `ATTACHMENT_ADDED`, `ATTACHMENT_REMOVED`, `CHECKLIST_ITEM_ADDED`, `CHECKLIST_ITEM_TOGGLED`, `CHECKLIST_ITEM_REMOVED` — but `AttachmentsService` and `ChecklistService` never actually write those entries (`tasks.service.ts` only writes `CREATED`, `ASSIGNED`/`UNASSIGNED`, `PRIORITY_CHANGED`, `DUE_DATE_CHANGED`, `BLOCKED_STATE_CHANGED`). So even the per-task timeline is incomplete. On top of that, there is no audit trail at all for things that aren't a task: board creation/deletion, user creation/deactivation, login, API token creation/revocation, board membership changes. "Audit log" as a compliance/ops feature means being able to answer "who did what, system-wide, and when" — which today is only partially possible, and only for tasks.

## What Changes

- Fill the gap in the existing per-task `ActivityLog`: `AttachmentsService` and `ChecklistService` write the activity entries their events already imply (the enum values already exist and are unused).
- Add a new system-wide `AuditLog` model (separate from the task-scoped `ActivityLog`, which stays as the task detail timeline) covering non-task actions: board create/delete, user create/update/deactivate, login (success/failure), API token create/revoke, board membership changes.
- Add an `AuditLogService` with a single `record(actorId, action, entityType, entityId, metadata)` method, called from the relevant services (boards, users, auth, api-tokens, board membership).
- Add `GET /audit-logs` (global-admin only) with filters: `actorId`, `entityType`, `action`, date range, pagination.

## Capabilities

### New Capabilities
- `audit-log`: system-wide audit trail recording and querying for non-task administrative/security-relevant actions.

### Modified Capabilities
(none — no existing spec covers audit logging; the existing `ActivityLog` model has no spec today either)

## Impact

- `backend/prisma/schema.prisma`: new `AuditLog` model + `AuditAction` enum.
- `backend/src/audit/` (new module): `AuditLogService`, `AuditLogController`.
- `backend/src/attachments/attachments.service.ts`, `backend/src/checklist/checklist.service.ts`: add missing `ActivityLog` writes.
- `backend/src/boards/`, `backend/src/users/`, `backend/src/auth/`: call `AuditLogService.record()` at the relevant points.
- If `add-api-tokens` and `add-rbac-board-roles` changes have landed, their services also call `AuditLogService.record()` for token/membership events; if not yet landed, those call sites are added when those changes are implemented (this change's `AuditLogService` is what they'll depend on).
