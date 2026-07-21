## Why

Today authorization is binary and global: `Role.ADMIN` vs `Role.MEMBER` on `User` (`backend/prisma/schema.prisma:11-14`), enforced by a global `RolesGuard` + `@Roles()` decorator. There is no per-board concept of ownership or membership — every authenticated user can read and write every board, column, task, and comment regardless of involvement. This isn't "RBAC", it's "logged in or not" plus a couple of admin-only endpoints (tags, user management, column creation). To call RBAC complete we need per-board roles (owner/admin/member/viewer) so boards can be scoped to the people who should actually have access, with different permission levels.

## What Changes

- Add board-level membership: `BoardMember` join table linking `User` ↔ `Board` with a `BoardRole` (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- Board creator is automatically granted `OWNER` on creation.
- Migration backfills existing boards: creator (if any) becomes `OWNER`, and all other existing users are added as `MEMBER` on all existing boards, so nobody currently able to see a board loses access on deploy (no silent lockout). **BREAKING** in the sense that going forward, *new* boards are private to their members by default — no longer implicitly visible to everyone.
- Global `Role.ADMIN` (site admin) continues to bypass board-level checks everywhere (super-admin escape hatch), unchanged.
- New `@BoardRoles(...)` decorator + `BoardMembershipGuard` resolve the board from the request (route param or via task/comment/attachment lookup) and check the caller's `BoardMember.role` (or global ADMIN) against the required minimum role.
- Endpoints gated by board role:
  - List/read board, tasks, comments, attachments, checklist: any board member (`VIEWER`+).
  - Create/edit/move/delete tasks, comments, checklist items, attachments: `MEMBER`+.
  - Manage columns, board settings, board membership: `ADMIN`+ (board-level, not just global).
  - Delete board: `OWNER` or global `ADMIN` only.
- New endpoints: `GET /boards/:id/members`, `POST /boards/:id/members`, `PATCH /boards/:id/members/:userId`, `DELETE /boards/:id/members/:userId`.
- Frontend: board settings gets a "Members" panel to add/remove members and change their board role (only visible to board `ADMIN`+); board list only shows boards the user is a member of (or all boards for global `ADMIN`).

## Capabilities

### New Capabilities
- `board-rbac`: board-scoped membership and role-based authorization for boards, tasks, comments, attachments, and checklist items.

### Modified Capabilities
(none — no existing spec covers authorization today; this is the first spec for it)

## Impact

- `backend/prisma/schema.prisma`: new `BoardMember` model, new `BoardRole` enum, new migration with backfill script.
- `backend/src/boards/*`: membership CRUD endpoints, guard usage on existing endpoints.
- `backend/src/tasks/*`, `backend/src/comments/*`, `backend/src/attachments/*`, `backend/src/checklist/*`: apply `@BoardRoles()` guard.
- `backend/src/common/guards/`, `backend/src/common/decorators/`: new `BoardMembershipGuard`, `@BoardRoles()`.
- `frontend/src/features/boards` (or equivalent): board list filtering, members management UI.
- `cli/src`: no change expected (CLI acts as the authenticated user; server enforces membership same as UI).
