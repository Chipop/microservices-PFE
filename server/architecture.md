# FlowForge Server Architecture

This document is the frontend developer contract for the backend. It explains
which service owns each feature, how to call every public endpoint through the
API gateway, what authentication is required, and which realtime/event behavior
the UI can rely on.

## Public Entry Point

All browser traffic should go through the API gateway:

- Local gateway base URL: `http://localhost:8080`
- Frontend build arg/env: `VITE_GATEWAY_URL=http://localhost:8080`
- Auth header for protected endpoints: `Authorization: Bearer <access_token>`
- JWT claim used by services: `user_id`
- Shared signing algorithm: HS256

Direct service ports are exposed for local debugging, but frontend code should
not hardcode them.

| Gateway path | Service | Local service port | Purpose |
|---|---|---:|---|
| `/api/auth/**` | `auth-service` | `8002` | Registration, login, sessions, password/security workflows |
| `/api/profiles/**` | `user-service` | `8001` | User profile metadata and public profiles |
| `/api/tasks/**` | `task-service` | `8003` | Tasks, comments, assignments, tags, reminders, statuses |
| `/api/workspaces/**` | `workspace-service` | `8004` | Workspaces, membership, invitations, permissions |
| `/api/projects/**` | `project-service` | `8009` | Workspace projects, project-only invitations, project permissions |
| `/api/attachments/**` | `attachment-service` | `8005` | Task/comment file metadata and signed download links |
| `/api/notifications/**` | `notification-service` | `8006` | In-app notification history and read/delete actions |
| `/ws/notifications` | `notification-service` | `8006` | Realtime notification socket |
| `/api/search/**` | `search-service` | `8008` | Global and scoped search |

## Cross-Cutting Rules

### Authentication

Protected endpoints require the access token returned by `POST /api/auth/login/`.
The token is stateless; backend services validate it locally and trust the
`user_id` claim. If the access token expires, call `POST /api/auth/refresh/`
with the refresh token and retry the original request once.

### Error Shape

Errors are service-specific:

- Django services usually return `{"detail": "..."}` or field errors like
  `{"email": ["..."]}`.
- Spring services return a structured Spring error body unless the exception
  handler normalizes it.
- Nest task-service returns standard Nest validation/error responses.

Frontend code should read `detail` when present and otherwise fall back to a
generic message for the HTTP status.

### Pagination

Spring services that return pages use Spring `Page<T>`:

```json
{
  "content": [],
  "number": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

Task/profile list endpoints generally return arrays.

### Date Fields

Date/time fields are ISO-8601 strings. Treat them as UTC unless the service
explicitly says otherwise.

## Auth Service

Owns accounts, JWTs, sessions, password reset, email verification, account
activation, and two-factor auth.

Base path: `/api/auth`

| Method | Path | Auth | Body | Response / behavior |
|---|---|---|---|---|
| `POST` | `/register/` | No | `{ "username", "email", "password" }` | Creates an auth user, publishes `user.registered`, requests email verification, and calls profile/workspace internal setup best-effort. |
| `POST` | `/login/` | No | `{ "username", "password", "two_factor_code?" }` | Returns `{ "access", "refresh" }` or `202 {"detail":"two_factor_required","two_factor_required":true}`. |
| `POST` | `/refresh/` | No | `{ "refresh" }` | Returns a new access token. |
| `POST` | `/verify/` | No | `{ "token" }` | Verifies token validity. |
| `POST` | `/logout/` | Yes | `{ "refresh" }` | Revokes one refresh session. |
| `POST` | `/logout-all/` | Yes | none | Revokes all active refresh sessions for the user. |
| `POST` | `/password/change/` | Yes | `{ "old_password", "new_password" }` | Changes password and logs out all sessions. |
| `POST` | `/password/forgot/` | No | `{ "email" }` | Always returns a neutral success message. In debug, may include `token`. |
| `POST` | `/password/reset/confirm/` | No | `{ "token", "new_password" }` | Resets password for a valid reset token. |
| `POST` | `/email/verify/request/` | Yes | none | Issues email verification token. |
| `POST` | `/email/verify/confirm/` | No | `{ "token" }` | Marks email verified. |
| `POST` | `/activation/request/` | Yes | none | Issues account activation token. |
| `POST` | `/activation/confirm/` | No | `{ "token" }` | Activates account token workflow. |
| `POST` | `/2fa/setup/` | Yes | none | Returns `{ "secret", "otpauth_url" }`. |
| `POST` | `/2fa/confirm/` | Yes | `{ "code" }` | Enables two-factor auth. |
| `POST` | `/2fa/disable/` | Yes | `{ "code" }` | Disables two-factor auth. |
| `GET` | `/sessions/` | Yes | none | Lists auth sessions. |
| `DELETE` | `/sessions/{id}/` | Yes | none | Revokes one auth session. |

Frontend notes:

- Store both access and refresh tokens.
- If login returns `two_factor_required`, prompt for a TOTP code and retry login
  with the same username/password plus `two_factor_code`.
- Registration currently logs the user in from the frontend after successful
  account creation.

## User/Profile Service

Owns user profile metadata and public profile pages. It does not own passwords
or authentication.

Base path: `/api/profiles`

| Method | Path | Auth | Body | Response / behavior |
|---|---|---|---|---|
| `GET` | `/` | Yes | none | Returns the current user profile as a one-item array. |
| `PATCH` | `/{id}/` | Yes | profile fields | Updates the caller's profile. |
| `GET` | `/public/{username}/` | No | none | Returns public profile fields. |
| `POST` | `/picture/` | Yes | multipart `file` | Uploads or creates profile picture. |
| `PUT` | `/picture/` | Yes | multipart `file` | Replaces profile picture. |
| `DELETE` | `/picture/` | Yes | none | Deletes profile picture. |

Important profile fields:

- `auth_user_id`: the auth-service user id.
- `username`, `email`, `biography`, `timezone`, `language`
- `profile_picture_url`: signed or public URL depending on storage backend.
- `preferences`: free-form JSON object.

## Task Service

Owns task data and task-adjacent collaboration features: statuses, assignments,
comments, tags, subtasks, dependencies, recurrence, reminders, kanban columns,
and saved filters.

Base path: `/api/tasks`

### Task Endpoints

| Method | Path | Auth | Body / query | Response / behavior |
|---|---|---|---|---|
| `GET` | `/` | Yes | optional `project_id`, `workspace_id`, filters | Lists visible project tasks. |
| `POST` | `/` | Yes | task create DTO with `project_id` | Creates a task in the requested project. |
| `GET` | `/{id}` | Yes | none | Loads one visible task. |
| `PATCH` | `/{id}` | Yes | partial task DTO | Updates task fields. |
| `DELETE` | `/{id}` | Yes | none | Soft-deletes task. |
| `POST` | `/{id}/complete` | Yes | none | Marks task complete. |
| `POST` | `/{id}/archive` | Yes | none | Archives task. |
| `GET` | `/{id}/permissions` | Yes | none | Returns task permission booleans for current user. |

Task response fields include:

- `id`, `project_id`, `workspace_id`, `author_user_id`
- `title`, `description`, `done`, `priority`
- `due_at`, `completed_at`, `archived_at`, `deleted_at`
- `status`, `kanban_column`
- `assignments`, `tags`, `subtasks`, `dependencies`, `reminders`
- `created_at`, `updated_at`

### Task Metadata Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET /statuses` | List user-owned statuses. |
| `POST /statuses` | Create status. |
| `PATCH /statuses/{statusId}` | Update status. |
| `DELETE /statuses/{statusId}` | Delete status and detach from tasks. |
| `GET /kanban-columns` | List kanban columns. |
| `POST /kanban-columns` | Create column. |
| `PATCH /kanban-columns/{columnId}` | Update column. |
| `DELETE /kanban-columns/{columnId}` | Delete column and detach from tasks. |
| `GET /saved-filters` | List saved filters. |
| `POST /saved-filters` | Create saved filter. |
| `PATCH /saved-filters/{filterId}` | Update saved filter. |
| `DELETE /saved-filters/{filterId}` | Delete saved filter. |

### Task Collaboration Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST /{id}/assignments` | Assign user id to task. |
| `DELETE /{id}/assignments/{assigneeUserId}` | Remove assignment. |
| `POST /{id}/tags` | Add tag. |
| `DELETE /{id}/tags/{tagId}` | Remove tag. |
| `POST /{id}/subtasks` | Create subtask. |
| `PATCH /{id}/subtasks/{subtaskId}` | Update subtask. |
| `DELETE /{id}/subtasks/{subtaskId}` | Delete subtask. |
| `POST /{id}/dependencies` | Add dependency. |
| `DELETE /{id}/dependencies/{dependencyId}` | Remove dependency. |
| `PUT /{id}/recurrence` | Create/update recurrence. |
| `POST /{id}/reminders` | Create reminder. |
| `DELETE /{id}/reminders/{reminderId}` | Delete reminder. |

### Comment Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET /{id}/comments` | List task comments. |
| `POST /{id}/comments` | Create task comment. |
| `PATCH /{id}/comments/{commentId}` | Update own comment. |
| `DELETE /{id}/comments/{commentId}` | Soft-delete comment when author/admin. |
| `GET /{id}/comments/{commentId}/permissions` | Permission booleans for comment attachments. |

Frontend notes:

- Use `project_id` when creating tasks. `workspace_id` remains available for
  filtering and event payloads, but it is derived from the project.
- Task events power search and some notifications, but frontend should still
  update local task state from REST responses.

## Project Service

Owns projects, project role overlays, and project-only invitation workflows.
Projects belong to workspaces and tasks belong to projects.

Base path: `/api/projects`

| Method | Path | Auth | Body / query | Response / behavior |
|---|---|---|---|---|
| `GET` | `/` | Yes | optional `workspace_id` | Lists projects visible to the caller. |
| `POST` | `/` | Yes | `{ "workspace_id", "name", "description?" }` | Creates a project; caller becomes project owner. |
| `GET` | `/{projectId}` | Yes | none | Loads one visible project. |
| `PATCH` | `/{projectId}` | Yes | `{ "name?", "description?" }` | Updates project admin fields; workspace cannot change. |
| `DELETE` | `/{projectId}` | Yes | none | Soft-deletes project when caller is author or admin. |
| `POST` | `/{projectId}/archive` | Yes | none | Archives project when caller is author or admin. |
| `GET` | `/{projectId}/permissions/me` | Yes | none | Permission booleans for current user. |

Project roles:

- `PROJECT_OWNER`, `PROJECT_ADMIN`, `CONTRIBUTOR`, `VIEWER`.
- Workspace roles are inherited, but explicit project membership can grant
  access to one project without workspace membership.

Project invitation endpoints:

- `GET /{projectId}/invitations`
- `POST /{projectId}/invitations`
- `POST /invitations/{token}/accept`
- `POST /invitations/{token}/reject`

Project-only invitees can see the workspace name snapshot, project details, and
tasks in that project only.

## Workspace Service

Owns workspaces, workspace roles, invitations, and workspace-level permissions.

Base path: `/api/workspaces`

| Method | Path | Auth | Body | Response / behavior |
|---|---|---|---|---|
| `GET` | `/` | Yes | none | Lists workspaces visible to current user. |
| `POST` | `/` | Yes | `{ "name", "description?", "visibility?", "publicContributionsEnabled?" }` | Creates team workspace and owner membership. |
| `GET` | `/{workspaceId}` | Yes | none | Loads one visible workspace. |
| `PATCH` | `/{workspaceId}` | Yes | partial workspace DTO | Updates workspace admin fields. |
| `DELETE` | `/{workspaceId}` | Yes | none | Soft-deletes workspace, owner only. |
| `POST` | `/{workspaceId}/archive` | Yes | none | Archives workspace, owner only. |
| `POST` | `/{workspaceId}/transfer-ownership` | Yes | `{ "newOwnerUserId" }` | Transfers owner role. |
| `GET` | `/{workspaceId}/permissions/me` | Yes | none | Permission booleans for current user. |

### Members

| Method | Path | Purpose |
|---|---|---|
| `GET /{workspaceId}/members` | List active members. |
| `PATCH /{workspaceId}/members/{targetUserId}/role` | Change member role. |
| `DELETE /{workspaceId}/members/{targetUserId}` | Remove member. |

Roles:

- `OWNER`: full control, only one owner expected.
- `ADMIN`: manage workspace/members.
- `MEMBER`: contribute.
- `VIEWER`: read-only.

### Invitations

| Method | Path | Purpose |
|---|---|---|
| `GET /{workspaceId}/invitations` | List invitations for admins/owners. |
| `POST /{workspaceId}/invitations` | Create invitation by email and role. |
| `POST /invitations/{token}/accept` | Accept invitation token. |
| `POST /invitations/{token}/reject` | Reject invitation token. |

Invitation create responses include the raw token. Store/show that token in the
UI immediately; it is not published on RabbitMQ and cannot be recovered later.

## Attachment Service

Owns attachment metadata and signed download URLs. File bytes are stored through
the configured storage backend.

Base path: `/api/attachments`

All endpoints require the caller's `Authorization` header. Upload endpoints use
`multipart/form-data` with field name `file`.

| Method | Path | Purpose |
|---|---|---|
| `POST /tasks/{taskId}` | Upload attachment to task. |
| `GET /tasks/{taskId}` | List task attachments. |
| `POST /tasks/{taskId}/comments/{commentId}` | Upload attachment to comment. |
| `GET /tasks/{taskId}/comments/{commentId}` | List comment attachments. |
| `GET /{attachmentId}` | Load attachment metadata if visible. |
| `POST /{attachmentId}/download-link` | Create signed read URL. |
| `DELETE /{attachmentId}` | Soft-delete attachment when uploader/admin. |

Attachment response fields:

- `id`, `targetType`, `targetId`, `parentTaskId`
- `originalFilename`, `contentType`, `sizeBytes`
- `uploaderUserId`, `createdAt`

## Notification Service

Owns in-app notifications. Notifications are created from RabbitMQ events that
carry explicit recipient user ids. Unsupported events are not bound to the
notification queue.

Base path: `/api/notifications`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/notifications?page=0&size=20` | Yes | Paged notification history. |
| `GET` | `/api/notifications/unread-count` | Yes | Returns `{ "count": number }`. |
| `PATCH` | `/api/notifications/{notificationId}/read` | Yes | Marks one notification read. |
| `PATCH` | `/api/notifications/read-all` | Yes | Marks all visible notifications read. |
| `DELETE` | `/api/notifications/{notificationId}` | Yes | Soft-deletes one notification. |

Notification response fields:

- `id`, `recipientUserId`, `type`, `title`, `message`
- `relatedResourceId`, `relatedResourceType`
- `isRead`, `createdAt`, `readAt`

Notification types currently exposed to the frontend:

- `TASK_ASSIGNED`
- `TASK_COMPLETED`
- `TASK_DEADLINE_APPROACHING`
- `WORKSPACE_ROLE_CHANGED`
- `USER_MENTIONED`
- `ATTACHMENT_ADDED` and `WORKSPACE_INVITATION_CREATED` exist in the model for
  compatibility but are not currently bound because their producer events do not
  include recipient user ids.

### Realtime Notifications

Connect to:

```text
ws://localhost:8080/ws/notifications?access_token=<access_token>
```

For HTTPS deployments use `wss://`.

Messages:

```json
{ "type": "notifications.connected", "payload": null }
```

```json
{
  "type": "notification.created",
  "payload": {
    "id": 1,
    "recipientUserId": 7,
    "type": "TASK_ASSIGNED",
    "title": "You were assigned a task",
    "message": "Task: Prepare release",
    "relatedResourceId": 42,
    "relatedResourceType": "TASK",
    "isRead": false,
    "createdAt": "2026-07-12T12:00:00Z",
    "readAt": null
  }
}
```

Frontend behavior:

- Load history with REST on app start.
- Open the WebSocket after login.
- On `notification.created`, prepend the notification and increment unread
  count if `isRead` is false.
- On logout, close the socket and clear local notification state.

## Search Service

Owns Elasticsearch indexes and query APIs. Search data is eventually consistent
from RabbitMQ events and can be rebuilt through an internal reindex endpoint.

Base path: `/api/search`

| Method | Path | Auth | Query | Purpose |
|---|---|---|---|---|
| `GET` | `/api/search?q=...&type=task,user` | Yes | `q`, optional `type`, `page`, `size` | Global search across selected or all indexes. |
| `GET` | `/api/search/tasks` | Yes | `q`, optional `status`, `priority`, `page`, `size` | Task-only search. |
| `GET` | `/api/search/workspaces` | Yes | `q`, `page`, `size` | Workspace-only search. |
| `GET` | `/api/search/users` | Yes | `q`, `page`, `size` | Public user search. |
| `GET` | `/api/search/comments` | Yes | `q`, `page`, `size` | Comment search scoped by visibility. |

Search response:

```json
{
  "query": "release",
  "page": 0,
  "size": 20,
  "total": 3,
  "items": [
    {
      "type": "task",
      "id": "42",
      "title": "Prepare release",
      "snippet": "Cut the backend release",
      "score": 1.23,
      "metadata": {}
    }
  ]
}
```

Visibility filtering:

- Tasks/comments are visible if the user is in `viewerUserIds`, owner, or
  author.
- Workspaces are visible to members/owners or when `visibility` is `PUBLIC`.
- Users are globally searchable.

## RabbitMQ Domain Events

Exchange: `flowforge.events`

Routing key equals `eventType`. Event envelope:

```json
{
  "eventId": "uuid",
  "eventType": "task.assigned",
  "occurredAt": "2026-07-12T12:00:00Z",
  "producer": "task-service",
  "actorUserId": 1,
  "resource": { "type": "task", "id": 42 },
  "data": {}
}
```

Frontend code does not consume RabbitMQ directly. It observes resulting REST
state and notification WebSocket messages.

### Published Events Used By Frontend-Visible Features

| Event | Producer | Consumers | Frontend-visible effect |
|---|---|---|---|
| `user.registered` | auth | email | Welcome email delivery record/send. |
| `user.profile.created` | user | search | New user appears in search. |
| `user.profile.updated` | user | search | User search/profile metadata updates. |
| `task.created` | task | search | Task appears in search. |
| `task.updated` | task | search | Task search document updates. |
| `task.deleted` | task | search | Task and related comment docs removed from search. |
| `task.assigned` | task | notification | Assignee gets in-app notification. |
| `task.completed` | task | notification | Other visible task participants get in-app notification. |
| `task.comment.created` | task | search | Comment appears in search. |
| `task.comment.updated` | task | search | Comment search document updates. |
| `task.comment.deleted` | task | search | Comment removed from search. |
| `workspace.created` | workspace | search | Workspace appears in search. |
| `workspace.updated` | workspace | search | Workspace search metadata updates. |
| `workspace.deleted` | workspace | search | Workspace removed from search. |
| `workspace.access_updated` | workspace | search | Workspace member visibility updates. |
| `workspace.role_changed` | workspace | notification | Target user gets in-app role-change notification. |
| `attachment.added` | attachment | none currently | Event is published for future consumers; no frontend realtime effect yet. |

### Consumer Reliability

- Notification, search, and email use durable RabbitMQ queues.
- These consumers declare service-specific dead-letter exchanges/queues.
- Notification creation is idempotent by `(source_event_id, recipient_user_id, type)`.
- Email delivery is idempotent by a hashed event/template/recipient key.
- Producers publish best-effort after database commit where supported.

## Data Ownership

| Data | Owning service | Notes |
|---|---|---|
| Users, credentials, auth sessions | auth-service | Other services trust JWT only. |
| Profile metadata | user-service | Mirrors auth user id as `auth_user_id`. |
| Tasks/comments/task metadata | task-service | Uses workspace permissions through workspace-service. |
| Workspaces/members/invitations | workspace-service | Source of truth for workspace roles. |
| Attachment metadata | attachment-service | Permission checks delegated to task-service. |
| In-app notifications | notification-service | Derived from events; user-owned read/delete state. |
| Email delivery records | email-service | External SMTP delivery audit. |
| Search indexes | search-service | Derived eventually from events/reindex. |

## Frontend Integration Checklist

1. Keep the gateway base URL in one config value.
2. Attach `Authorization: Bearer <access>` to all protected REST calls.
3. Refresh access token once on 401, then retry the request.
4. Load profile after login from `GET /api/profiles/`.
5. Load notifications and unread count after login.
6. Open `/ws/notifications?access_token=<access>` after login and close it on logout.
7. Treat search as eventually consistent after writes.
8. Treat invitation tokens as sensitive, one-time workflow data returned by the invitation creation endpoint, not as recoverable event data.
9. Use REST responses as the source of truth after mutations; events are for backend projection/realtime fanout.
