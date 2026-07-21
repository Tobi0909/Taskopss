# board-rbac Specification

## Purpose
TBD - created by archiving change add-rbac-board-roles. Update Purpose after archive.
## Requirements
### Requirement: Board membership model
The system SHALL associate each user who can access a board with exactly one `BoardRole` (`OWNER`, `ADMIN`, `MEMBER`, or `VIEWER`) via a `BoardMember` record unique per `(boardId, userId)`.

#### Scenario: Creating a board grants ownership
- **WHEN** a user creates a new board
- **THEN** the system creates a `BoardMember` record for that user on that board with role `OWNER`

### Requirement: Global admin bypass
The system SHALL allow users with the global `Role.ADMIN` to perform any board, task, comment, attachment, or checklist action regardless of their `BoardMember` role or absence of one.

#### Scenario: Global admin without board membership
- **WHEN** a user with global `Role.ADMIN` and no `BoardMember` record for a board performs any action on that board
- **THEN** the system allows the action

### Requirement: Minimum-role enforcement on board resources
The system SHALL reject requests to modify a board, its columns, or its membership from users whose `BoardMember` role is below `ADMIN`, and SHALL reject read requests from users with no `BoardMember` record at all (unless they are a global admin).

#### Scenario: Member cannot manage columns
- **WHEN** a user with board role `MEMBER` sends `POST /boards/:id/columns`
- **THEN** the system responds with HTTP 403

#### Scenario: Non-member cannot read board
- **WHEN** a user with no `BoardMember` record for a board sends `GET /boards/:id`
- **THEN** the system responds with HTTP 403

#### Scenario: Viewer can read but not modify
- **WHEN** a user with board role `VIEWER` sends `GET /boards/:id`
- **THEN** the system responds with HTTP 200

### Requirement: Minimum-role enforcement on task-scoped resources
The system SHALL require board role `MEMBER` or above to create, update, move, or delete tasks, comments, attachments, and checklist items, and SHALL require at least `VIEWER` to read them.

#### Scenario: Viewer cannot create a task
- **WHEN** a user with board role `VIEWER` sends `POST /tasks` for a task on that board
- **THEN** the system responds with HTTP 403

#### Scenario: Member can create a task
- **WHEN** a user with board role `MEMBER` sends `POST /tasks` for a task on that board
- **THEN** the system creates the task and responds with HTTP 201

### Requirement: Board deletion restricted to owner
The system SHALL only allow a board's `OWNER` (or a global admin) to delete the board.

#### Scenario: Board admin cannot delete
- **WHEN** a user with board role `ADMIN` (not `OWNER`) sends `DELETE /boards/:id`
- **THEN** the system responds with HTTP 403

### Requirement: Board membership management endpoints
The system SHALL expose endpoints to list, add, update, and remove `BoardMember` records, restricted to callers with board role `ADMIN` or above (or global admin).

#### Scenario: Admin adds a member
- **WHEN** a user with board role `ADMIN` sends `POST /boards/:id/members` with a target userId and role `MEMBER`
- **THEN** the system creates the `BoardMember` record and responds with HTTP 201

#### Scenario: Member cannot add a member
- **WHEN** a user with board role `MEMBER` sends `POST /boards/:id/members`
- **THEN** the system responds with HTTP 403

### Requirement: Existing access preserved on migration
The system SHALL ensure that, immediately after the migration that introduces board membership, every user who previously had implicit access to a board (i.e. every existing user, for every existing board) retains at least `MEMBER` access, and each board's creator holds `OWNER`.

#### Scenario: Pre-existing user retains access after migration
- **WHEN** the migration backfill runs against a database with existing boards and users
- **THEN** every existing user has a `BoardMember` record with role `MEMBER` or higher on every existing board

