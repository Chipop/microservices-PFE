# Task Service

## Purpose

`task-service` owns task management for the platform. It replaces the former
simple todo runtime and exposes the public gateway contract under `/api/tasks/`.

The service is stateless for authentication. It validates the JWT access token
issued by `auth-service`, extracts the `user_id` claim, and scopes all task
access to that owner. It does not call `auth-service` or `user-service` during
request handling.

## Runtime

- Framework: NestJS
- ORM: TypeORM
- Container service: `task-service`
- Internal port: `8000`
- Host port: `8003`
- Database: `tasks-db`
- Database volume: `tasks_pgdata`
- Gateway route: `/api/tasks/`

## Responsibilities

- Create, retrieve, edit, delete, archive, and complete tasks.
- Manage statuses, priorities, deadlines, tags, subtasks, dependencies,
  recurrence configuration, reminders, Kanban columns, and saved filters.
- Assign tasks by auth user id.
- Validate task permissions by owner-scoping every operation to the JWT
  `user_id`.
- Hide cross-user tasks by returning `404`.

Events are intentionally not published yet. Task mutations are centralized in
`TasksService`, so a future Kafka/RabbitMQ publisher can be added there without
rewriting controller logic.

## Owned Data

The service owns its full task database. Other services must not read or write
these tables directly.

- `tasks`
- `task_statuses`
- `task_assignments`
- `tags`
- `task_tags`
- `subtasks`
- `task_dependencies`
- `task_recurrences`
- `task_reminders`
- `kanban_columns`
- `saved_filters`

Assignments store auth user IDs only. The service does not store passwords,
tokens, or user profile data.

## Public API

All routes require:

```text
Authorization: Bearer <access-token>
```

Core task routes:

| Method | Path | Description |
|---|---:|---|
| `GET` | `/api/tasks/` | List active tasks owned by the JWT user. |
| `POST` | `/api/tasks/` | Create a task. |
| `GET` | `/api/tasks/{id}/` | Read one owned task. |
| `PATCH` | `/api/tasks/{id}/` | Update one owned task. |
| `DELETE` | `/api/tasks/{id}/` | Hard-delete one owned task. |
| `POST` | `/api/tasks/{id}/complete` | Mark a task complete. |
| `POST` | `/api/tasks/{id}/archive` | Archive a task without deleting it. |

The former simple payload still works through `/api/tasks/`:

```json
{
  "title": "first task",
  "done": false
}
```

Task responses include a derived `done` boolean for frontend compatibility:

```json
{
  "id": 1,
  "title": "first task",
  "description": "",
  "done": false,
  "priority": "normal",
  "due_at": null,
  "completed_at": null,
  "archived_at": null,
  "status": { "id": 1, "name": "Todo", "slug": "todo" },
  "created_at": "2026-07-11T00:00:00.000Z",
  "updated_at": "2026-07-11T00:00:00.000Z"
}
```

Supporting routes:

- `/api/tasks/{id}/assignments`
- `/api/tasks/{id}/tags`
- `/api/tasks/{id}/subtasks`
- `/api/tasks/{id}/dependencies`
- `/api/tasks/{id}/recurrence`
- `/api/tasks/{id}/reminders`
- `/api/tasks/statuses`
- `/api/tasks/kanban-columns`
- `/api/tasks/saved-filters`

## Validation

- Unknown payload fields are rejected.
- `title` is required on create and limited to 200 characters.
- `priority` must be one of `low`, `normal`, `high`, `urgent`.
- Deadlines and reminders must be ISO datetime strings.
- Assignee IDs must be positive integers.
- Dependencies must point to tasks owned by the same JWT user.
- Self-dependencies and circular dependencies are rejected.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key for JWT validation. |
| `PORT` | No | App port, defaults to `8000`. |
| `POSTGRES_HOST` | In Compose | DB hostname. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `tasks`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |
| `TASK_SCHEMA_SYNC` | No | Local schema sync toggle. Use `false` in production. |

## Persistence

Compose sets `TASK_SCHEMA_SYNC=true` so local development starts without a
manual migration step. For production, set `TASK_SCHEMA_SYNC=false` and run
explicit TypeORM migrations as part of deployment.

## Local Commands

```bash
cd server/task-service
npm install
npm run build
npm run start:prod
```

For development:

```bash
npm run start:dev
```
