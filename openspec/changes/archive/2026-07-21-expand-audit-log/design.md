## Context

`ActivityLog` (`backend/prisma/schema.prisma:223-235`) requires a non-null `taskId` — it's structurally task-scoped and used for the per-task timeline (`GET /tasks/:id/activity` → `TasksService.getActivityLog()`). It can't represent "user X deactivated user Y" or "board Z deleted" since those have no task. `@nestjs/event-emitter` is already wired globally (`app.module.ts`) and used by `NotificationsService`/`RealtimeGateway`.

## Goals / Non-Goals

**Goals:**
- Make the existing per-task timeline complete (attachments/checklist already have enum values defined for this).
- Add a queryable, system-wide audit trail for administrative and security-relevant actions that aren't tied to a task.
- Keep the two concerns (task timeline vs system audit) as separate models — they have different shapes and different consumers (task detail UI vs admin audit screen).

**Non-Goals:**
- Not merging `ActivityLog` into the new `AuditLog` model — that would require a `taskId` migration to nullable plus a broader `entityType`/`entityId` polymorphic redesign, which is riskier than adding a second, purpose-built model.
- Not adding log shipping to an external SIEM/log system in this pass — just DB-backed storage and an admin-facing query endpoint.

## Decisions

- **Separate `AuditLog` model** rather than generalizing `ActivityLog`: `AuditLog { id, actorId, action: AuditAction, entityType: String, entityId: String, metadata: Json, createdAt }`. `entityType`/`entityId` are plain strings (not a Prisma relation) since the entity can be any model (`Board`, `User`, `ApiToken`, `BoardMember`) — a typed relation per entity type would require a union/polymorphic pattern Prisma doesn't support natively.
- **`AuditAction` enum** distinct from `ActivityAction`: `BOARD_CREATED`, `BOARD_DELETED`, `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `API_TOKEN_CREATED`, `API_TOKEN_REVOKED`, `BOARD_MEMBER_ADDED`, `BOARD_MEMBER_ROLE_CHANGED`, `BOARD_MEMBER_REMOVED`. Extensible by adding enum values as new capabilities land.
- **`AuditLogService.record()` called directly from services**, not via `@OnEvent()` listeners: audit writes should happen in the same transaction/request as the action they record (so a rolled-back transaction doesn't leave an orphaned audit entry, and so we don't need to guarantee event-listener ordering/at-least-once semantics for something that must not be lost). This differs from the notification/realtime pattern (which is fine to be eventually-consistent) — audit correctness matters more.
- **Query endpoint restricted to global `Role.ADMIN`**: `GET /audit-logs?actorId=&entityType=&action=&from=&to=&page=` — audit trail visibility is an admin concern, consistent with existing `@Roles(Role.ADMIN)` usage on user management.
- **Attachments/checklist activity fill-in**: straightforward — `AttachmentsService.create()`/`remove()` and `ChecklistService` create/toggle/remove already have the task id and actor in scope; add `tx.activityLog.create()` calls mirroring the existing pattern in `tasks.service.ts`.

## Risks / Trade-offs

- [Risk] Two similarly-named log tables (`ActivityLog` vs `AuditLog`) could confuse future contributors → Mitigation: doc comment on both models in `schema.prisma` clarifying task-timeline vs system-audit scope.
- [Risk] Unbounded audit log growth over time → Mitigation: out of scope for this change (no retention policy yet); `entityType`+`createdAt` index keeps queries fast regardless.
- [Risk] Login-failure auditing could log sensitive info (e.g. attempted email) → Mitigation: only store the attempted email in `metadata`, never the password; this is standard practice for auth audit trails.
