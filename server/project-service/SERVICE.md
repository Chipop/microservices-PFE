# Project Service

## Purpose

`project-service` owns workspace-scoped projects, project-level role overlays,
and project-only invitations. Tasks belong to projects, and projects belong to
workspaces.

The service validates JWT access tokens from `auth-service`, extracts
`user_id`, and calls `workspace-service` for inherited workspace permissions.
Project-only invitees are stored as project members and can access only that
project and its tasks.

## Runtime

- Framework: NestJS
- ORM: TypeORM
- Container service: `project-service`
- Internal port: `8000`
- Host port: `8009`
- Database: `projects-db`
- Database volume: `projects_pgdata`
- Gateway route: `/api/projects/`

## Owned Data

- `projects`
- `project_members`
- `project_invitations`

Project roles:

- `PROJECT_OWNER`
- `PROJECT_ADMIN`
- `CONTRIBUTOR`
- `VIEWER`

## Public API

All public routes require:

```text
Authorization: Bearer <access-token>
```

| Method | Path | Description |
|---|---:|---|
| `GET` | `/api/projects/` | List projects visible to the caller. Optional `workspace_id`. |
| `POST` | `/api/projects/` | Create a project in a workspace. Any active workspace member may create. |
| `GET` | `/api/projects/{id}` | Read one visible project. |
| `PATCH` | `/api/projects/{id}` | Update project name/description. Workspace cannot be changed. |
| `DELETE` | `/api/projects/{id}` | Soft-delete a project when caller is author or admin. |
| `POST` | `/api/projects/{id}/archive` | Archive a project when caller is author or admin. |
| `GET` | `/api/projects/{id}/permissions/me` | Permission summary for current caller. |

Invitation/member routes:

- `GET /api/projects/{id}/members`
- `PATCH /api/projects/{id}/members/{userId}`
- `DELETE /api/projects/{id}/members/{userId}`
- `GET /api/projects/{id}/invitations`
- `POST /api/projects/{id}/invitations`
- `POST /api/projects/invitations/{token}/accept`
- `POST /api/projects/invitations/{token}/reject`

Create project payload:

```json
{
  "workspace_id": 1,
  "name": "Mobile App",
  "description": "Project workstream"
}
```

Invite payload:

```json
{
  "email": "teammate@example.com",
  "role": "CONTRIBUTOR"
}
```

Invitation acceptance verifies the logged-in user's profile email through
`user-service` before adding project membership.

## Internal API

`task-service` calls this endpoint to migrate legacy workspace-only tasks:

```text
POST /api/projects/internal/default
X-Internal-Key: <INTERNAL_API_KEY>
```

Payload:

```json
{
  "workspace_id": 1,
  "author_user_id": 1,
  "name": "Default Project"
}
```

The endpoint is idempotent for a workspace, author, and project name.

## Permissions

- Workspace `OWNER` and `ADMIN` administer all projects in that workspace.
- Workspace `MEMBER` inherits `CONTRIBUTOR`.
- Workspace `VIEWER` inherits `VIEWER`.
- Explicit project membership can grant project-only access without workspace membership.
- Project author, project admin/owner, and workspace admin/owner may archive or soft-delete projects.
- Archived/deleted projects are hidden from normal reads except to author/admin.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key used by `auth-service`. |
| `INTERNAL_API_KEY` | Yes | Allows task-service legacy default project creation. |
| `PORT` | No | Service port, defaults to `8000`. |
| `POSTGRES_HOST` | In Compose | DB hostname. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `projects`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |
| `PROJECT_SCHEMA_SYNC` | No | Local schema sync toggle. Use `false` in production. |
| `PROJECT_INVITATION_TTL_HOURS` | No | Invitation lifetime, defaults to 168 hours. |
| `WORKSPACE_SERVICE_BASE_URL` | In Compose | Internal workspace-service URL. |
| `USER_SERVICE_BASE_URL` | In Compose | Internal user-service URL. |
| `RABBITMQ_URL` | No | AMQP URL for domain event publishing. |
| `RABBITMQ_EXCHANGE` | No | Topic exchange for domain events, defaults to `flowforge.events`. |
