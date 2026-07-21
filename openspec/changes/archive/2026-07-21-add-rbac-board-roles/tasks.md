## 1. Schema & migration

- [x] 1.1 Add `BoardRole` enum (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) to `backend/prisma/schema.prisma`
- [x] 1.2 Add `BoardMember` model (`id`, `boardId`, `userId`, `role`, `createdAt`, `@@unique([boardId, userId])`, indexes on `boardId` and `userId`)
- [x] 1.3 Generate Prisma migration
- [x] 1.4 Write backfill logic in the migration: creator → `OWNER`, every other existing user → `MEMBER`, for every existing board (verified against seeded data: admin became OWNER, 3 other seed users became MEMBER)

## 2. Guard & decorator

- [x] 2.1 Create `backend/src/common/decorators/board-roles.decorator.ts` exporting `@BoardRoles(minRole, resolveBoardId)` (decorator also takes the resolver, not just the role, since board id resolution differs per route shape)
- [x] 2.2 Create `backend/src/common/guards/board-membership.guard.ts`: resolves boardId via a pluggable resolver function, bypasses for global `Role.ADMIN`, compares `BoardMember.role` rank, throws `ForbiddenException` otherwise
- [x] 2.3 Add rank-map helper `BOARD_ROLE_RANK` / `meetsMinimumBoardRole` in `backend/src/common/board-role-rank.ts`
- [ ] 2.4 Automated unit tests for the guard — **not written**; behavior was instead verified end-to-end against a real running server + real Postgres (see section 6). Recommend adding guard-level unit tests as a fast follow.

## 3. Board endpoints

- [x] 3.1 `BoardsService.create()`: creates the `BoardMember(OWNER)` row in the same transaction as board creation (new `POST /boards` endpoint was added — it didn't exist before this change)
- [x] 3.2 `BoardsController.findAll()`: filters to boards where the caller has a `BoardMember` row (global admin sees all)
- [x] 3.3 Apply `@BoardRoles(VIEWER)` to `GET /boards/:id`
- [x] 3.4 Apply `@BoardRoles(ADMIN)` to `POST /boards/:id/columns` and `PATCH/DELETE /columns/:id` (replacing the old global `@Roles(Role.ADMIN)`)
- [x] 3.5 Add `DELETE /boards/:id` restricted to `@BoardRoles(OWNER)`
- [x] 3.6 Add `GET/POST /boards/:id/members`, `PATCH/DELETE /boards/:id/members/:userId`, all `@BoardRoles(ADMIN)` except read which is `@BoardRoles(VIEWER)`

## 4. Task/comment/attachment/checklist endpoints

- [x] 4.1 Apply `@BoardRoles(VIEWER)` to read endpoints in `tasks`, `comments`, `attachments`, `checklist` controllers (including the nested `tasks/:taskId/comments`, `/attachments`, `/checklist-items` controllers)
- [x] 4.2 Apply `@BoardRoles(MEMBER)` to create/update/delete/move endpoints in the same controllers
- [x] 4.3 Register `BoardMembershipGuard` globally as `APP_GUARD` (deviation from the original plan of per-route `@UseGuards`: the guard already no-ops when no `@BoardRoles()` metadata is present on a route, exactly like the existing global `RolesGuard`, so global registration avoids boilerplate on every non-board-scoped controller)
- Note: `GET /tasks` (list, no `:id`) has no single board to gate on a 403 basis since it can span boards — instead `TasksService.findAll()` now adds a `board.members.some({ userId })` filter for non-global-admin callers, so the response itself is scoped rather than the whole request being blocked.
- Note: `dashboard` stats endpoint was **not** scoped to board membership — it remains a cross-board aggregate for any authenticated user, same as before this change. Flagged as a known gap, not fixed in this pass (would require reworking every query inside `DashboardService`).

## 5. Frontend

- [ ] 5.1 Board list — **no frontend change needed**: it already renders whatever `GET /boards` returns, which is now server-filtered.
- [ ] 5.2 "Members" management panel in board settings — **not built** in this pass. Backend endpoints exist (`GET/POST /boards/:id/members`, etc.) but there's no UI for them yet.
- [ ] 5.3 Hide/disable mutation UI for `VIEWER`s — **not built**. The server already rejects the underlying requests (403), but the frontend doesn't yet hide the buttons, so a viewer would see an error toast rather than a disabled button.

## 6. Verification

- [x] 6.1 Ran the migration against a real (temporary) Postgres seeded via `prisma/seed.ts`; confirmed the board's creator (admin) became `OWNER` and the 3 other seeded users became `MEMBER`
- [x] 6.2 Manually verified end-to-end against a running server with real auth (login as seeded users, real JWTs):
  - Non-member gets 403 reading a board (`GET /boards/:id`)
  - Adding as `VIEWER` allows read (200) but rejects task creation (403)
  - Upgrading to `MEMBER` allows task creation (201) but still rejects column creation (403) and board deletion (403)
  - Global `Role.ADMIN` bypasses everything, including deleting a board it doesn't own
