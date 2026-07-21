## Context

`backend/prisma/schema.prisma` has a single global `Role` enum (`ADMIN`, `MEMBER`) on `User`. `RolesGuard` + `@Roles()` (`backend/src/common/`) check that global role only. `Board`, `Task`, `Comment`, `Attachment`, `ChecklistItem` have no ownership/membership concept — `BoardsController.findAll()` returns every board to every authenticated user. `frontend/src/features/members` exists today for global user management (not board membership).

## Goals / Non-Goals

**Goals:**
- Introduce per-board roles without breaking any board/task/comment access that currently works for existing users.
- Keep the existing global `ADMIN`/`MEMBER` split as a site-wide super-admin escape hatch, not remove it.
- Make the guard reusable across controllers that operate on boards, tasks, comments, attachments, checklist items (all of which hang off a `boardId`, directly or via their parent task).

**Non-Goals:**
- Not building granular per-permission (e.g. "can edit title but not delete") — four ordered roles (OWNER > ADMIN > MEMBER > VIEWER) is enough.
- Not changing the global `Role` enum's existing usage (tags, user management) — those stay as-is.

## Decisions

- **New `BoardRole` enum**: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`, ordered by privilege. Stored on a `BoardMember` join model (`boardId`, `userId`, `role`, `@@unique([boardId, userId])`) rather than adding array/JSON columns on `Board` — keeps it queryable and consistent with how `TaskTag` already models many-to-many.
- **Guard resolves board id per-route**: `@BoardRoles(minRole)` decorator + `BoardMembershipGuard` reads `req.params.boardId` directly where present (board/column routes), or looks up `Task.boardId` via `req.params.taskId`/`id` for task/comment/attachment/checklist routes (one extra indexed query, acceptable — these are already single-record fetches). This avoids requiring every controller to pass `boardId` explicitly in the URL.
- **Global ADMIN bypass**: `BoardMembershipGuard` checks `req.user.role === Role.ADMIN` first and short-circuits to allow — matches existing expectation that global admins can do anything, and avoids needing to backfill `BoardMember` rows for admins.
- **Backfill migration**: a data-migration script (Prisma migration with a `$executeRaw` step, or a one-off script run as part of `prisma migrate deploy`) that: (a) for every `Board.createdById` that's non-null, inserts a `BoardMember(role: OWNER)` row if missing; (b) for every other existing `User`, inserts `BoardMember(role: MEMBER)` on every existing `Board` if missing. This preserves current "everyone can see every board" behavior for boards that already exist; only *new* boards start private to their creator.
- **Ordering comparison**: role check done via a numeric rank map (`{OWNER:3, ADMIN:2, MEMBER:1, VIEWER:0}`) rather than enum position tricks, so `MEMBER`+ checks are a simple `>=` comparison.

## Risks / Trade-offs

- [Risk] Extra DB lookup per request to resolve `boardId` from a task/comment id → Mitigation: these are indexed single-row `findUnique` calls, negligible compared to the existing per-request Prisma queries.
- [Risk] Backfill migration inserting `MEMBER` rows for every user × every existing board could be a large one-time write on boards with many users → Mitigation: acceptable for current data volume (small internal tool); batch the insert in the migration script if it becomes slow.
- [Risk] Frontend board list currently assumes all boards are visible; filtering by membership could hide boards users expect to see right after deploy → Mitigation: backfill (above) ensures existing users keep access to existing boards; only new boards are scoped from day one.

## Migration Plan

1. Add `BoardMember` model + `BoardRole` enum, generate Prisma migration.
2. Write and run backfill script as part of the same migration (or immediately after, before guards go live).
3. Ship guards disabled-by-default behind existing endpoints being additive only at first (new endpoints for membership management), then enable enforcement on read/write endpoints in the same deploy once backfill is confirmed complete in the target environment.
4. Rollback: drop `BoardMember` table and enum via `prisma migrate` down path; guards fail open only if explicitly reverted in code (no feature flag — this is a code revert, consistent with "change the code directly" rather than adding a flag).
