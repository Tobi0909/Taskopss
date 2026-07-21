## ADDED Requirements

### Requirement: System-wide audit recording
The system SHALL record an `AuditLog` entry for every board creation/deletion, user creation/update/deactivation, login attempt (success or failure), API token creation/revocation, and board membership change, capturing the actor (if any), action, target entity type and id, and a metadata payload.

#### Scenario: Board deletion is audited
- **WHEN** a board is deleted
- **THEN** the system creates an `AuditLog` entry with action `BOARD_DELETED`, the deleting user as actor, and the board's id as `entityId`

#### Scenario: Failed login is audited without leaking credentials
- **WHEN** a login attempt fails due to an incorrect password
- **THEN** the system creates an `AuditLog` entry with action `LOGIN_FAILED` and the attempted email in `metadata`, and never stores the submitted password

### Requirement: Audit log query endpoint
The system SHALL expose `GET /audit-logs`, restricted to users with global `Role.ADMIN`, supporting filters by `actorId`, `entityType`, `action`, and a date range, with pagination.

#### Scenario: Admin queries audit log
- **WHEN** a user with global `Role.ADMIN` sends `GET /audit-logs?entityType=Board`
- **THEN** the system responds with HTTP 200 and a paginated list of matching `AuditLog` entries

#### Scenario: Non-admin cannot query audit log
- **WHEN** a user without global `Role.ADMIN` sends `GET /audit-logs`
- **THEN** the system responds with HTTP 403

### Requirement: Complete per-task activity timeline
The system SHALL record a task-scoped `ActivityLog` entry when an attachment is added or removed, and when a checklist item is added, toggled, or removed, using the existing `ActivityAction` enum values already defined for these events.

#### Scenario: Attachment upload appears in task timeline
- **WHEN** a user uploads an attachment to a task
- **THEN** `GET /tasks/:id/activity` includes an entry with action `ATTACHMENT_ADDED` for that task

#### Scenario: Checklist toggle appears in task timeline
- **WHEN** a user toggles a checklist item on a task
- **THEN** `GET /tasks/:id/activity` includes an entry with action `CHECKLIST_ITEM_TOGGLED` for that task
