# Task Service

## Purpose

`task-service` owns category-scoped task management. It
replaces the former simple todo runtime and exposes the public gateway contract
under `/api/tasks/`.

The service is stateless for authentication. It validates the JWT access token
issued by `auth-service`, extracts the `user_id` claim, and checks project
visibility/contribution permissions through `category-service`.

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

- Create, retrieve, edit, soft-delete, archive, and complete tasks.
- Manage statuses, priorities, deadlines, tags, subtasks, dependencies,
  recurrence configuration, reminders, Kanban columns, and saved filters.
- Assign tasks by auth user id.
- Validate task permissions through category visibility and contribution rules.
- Hide cross-user tasks by returning `404`.
- Publish RabbitMQ domain events for task create, update, assignment, and
  completion.

Events are published from `TasksService` after successful database writes. A
broker failure is logged and does not fail the API request.

## Owned Data

The service owns its full task database. Other services must not read or write
these tables directly.

- `tasks`
- `task_activities`
- `task_assignments`
- `tags`
- `task_tags`
- `subtasks`
- `task_dependencies`
- `task_recurrences`
- `task_reminders`
- `kanban_columns`
- `saved_filters`

Tasks store mandatory category identity in the legacy `project_id` database column,
denormalized `workspace_id`, and
`author_user_id`, plus a direct fixed `status` value. Assignments and
activities store auth user IDs only. The service does not store passwords,
tokens, or user profile data.

## Public API

All routes require:

```text
Authorization: Bearer <access-token>
```

Core task routes:

| Method | Path | Description |
|---|---:|---|
| `GET` | `/api/tasks/` | List active tasks in categories visible to the JWT user. |
| `POST` | `/api/tasks/` | Create a task. |
| `GET` | `/api/tasks/{id}/` | Read one visible task. |
| `PATCH` | `/api/tasks/{id}/` | Update one task where the caller can contribute. |
| `DELETE` | `/api/tasks/{id}/` | Soft-delete one task if caller is author or project admin. |
| `POST` | `/api/tasks/{id}/complete` | Mark a task complete. |
| `POST` | `/api/tasks/{id}/archive` | Archive a task without deleting it. |
| `GET` | `/api/tasks/{id}/activity` | List persisted task activity entries. |
| `GET` | `/api/tasks/{id}/permissions` | Permission summary for other services. |

Create payload:

```json
{
  "category_id": 1,
  "title": "first task",
  "status": "todo",
  "done": false
}
```

Task responses include a derived `done` boolean for frontend compatibility:

```json
{
  "id": 1,
  "category_id": 1,
  "project_id": 1,
  "workspace_id": 1,
  "author_user_id": 1,
  "title": "first task",
  "description": "",
  "done": false,
  "priority": "normal",
  "due_at": null,
  "completed_at": null,
  "archived_at": null,
  "deleted_at": null,
  "status": "todo",
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
- `/api/tasks/{id}/activity`
- `/api/tasks/kanban-columns`
- `/api/tasks/saved-filters`

## Validation

- Unknown payload fields are rejected.
- `category_id` is required on create and must point to a category where the
  caller can contribute.
- `title` is required on create and limited to 200 characters.
- `priority` must be one of `low`, `normal`, `high`, `urgent`.
- `status` must be one of `backlog`, `todo`, `in_progress`, `review`, `done`,
  `archived`.
- Deadlines and reminders must be ISO datetime strings.
- Assignee IDs must be positive integers.
- Dependencies must point to tasks where the caller can contribute.
- Self-dependencies and circular dependencies are rejected.
- Soft-deleted tasks are hidden from normal reads.

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
| `WORKSPACE_SERVICE_BASE_URL` | In Compose | Internal workspace-service URL. |
| `CATEGORY_SERVICE_BASE_URL` | In Compose | Internal category-service URL. |
| `RABBITMQ_URL` | No | AMQP URL for domain event publishing. |
| `RABBITMQ_EXCHANGE` | No | Topic exchange for domain events, defaults to `flowforge.events`. |

## Events

The service publishes:

- `task.created`
- `task.updated`
- `task.assigned`
- `task.completed`

See [`../EVENTS.md`](../EVENTS.md) for the shared event envelope, routing keys,
payload fields, and sensitive-data rules.

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
