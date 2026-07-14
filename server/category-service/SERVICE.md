# Category Service

## Purpose

`category-service` owns workspace-scoped categories, category-level role overlays,
and category-only invitations. Tasks belong to categories, and categories belong to
workspaces.

The service validates JWT access tokens from `auth-service`, extracts
`user_id`, and calls `workspace-service` for inherited workspace permissions.
Category-only invitees are stored as category members and can access only that
category and its tasks.

## Runtime

- Framework: NestJS
- ORM: TypeORM
- Container service: `category-service`
- Internal port: `8000`
- Host port: `8009`
- Database: `categories-db`
- Database volume: `categories_pgdata`
- Gateway route: `/api/categories/`

## Owned Data

- `categories`
- `category_members`
- `category_invitations`

Category roles:

- `CATEGORY_OWNER`
- `CATEGORY_ADMIN`
- `CONTRIBUTOR`
- `VIEWER`

## Public API

All public routes require:

```text
Authorization: Bearer <access-token>
```

| Method | Path | Description |
|---|---:|---|
| `GET` | `/api/categories/` | List categories visible to the caller. Optional `workspace_id`. |
| `POST` | `/api/categories/` | Create a category in a workspace. Any active workspace member may create. |
| `GET` | `/api/categories/{id}` | Read one visible category. |
| `PATCH` | `/api/categories/{id}` | Update category name/description. Workspace cannot be changed. |
| `DELETE` | `/api/categories/{id}` | Soft-delete a category when caller is author or admin. |
| `POST` | `/api/categories/{id}/archive` | Archive a category when caller is author or admin. |
| `GET` | `/api/categories/{id}/permissions/me` | Permission summary for current caller. |

Invitation/member routes:

- `GET /api/categories/{id}/members`
- `PATCH /api/categories/{id}/members/{userId}`
- `DELETE /api/categories/{id}/members/{userId}`
- `GET /api/categories/{id}/invitations`
- `POST /api/categories/{id}/invitations`
- `POST /api/categories/invitations/{token}/accept`
- `POST /api/categories/invitations/{token}/reject`

Create category payload:

```json
{
  "workspace_id": 1,
  "name": "Mobile App",
  "description": "Category workstream"
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
`user-service` before adding category membership.

## Internal API

`task-service` calls this endpoint to migrate legacy workspace-only tasks:

```text
POST /api/categories/internal/default
X-Internal-Key: <INTERNAL_API_KEY>
```

Payload:

```json
{
  "workspace_id": 1,
  "author_user_id": 1,
  "name": "Default Category"
}
```

The endpoint is idempotent for a workspace, author, and category name.

## Permissions

- Workspace `OWNER` and `ADMIN` administer all categories in that workspace.
- Workspace `MEMBER` inherits `CONTRIBUTOR`.
- Workspace `VIEWER` inherits `VIEWER`.
- Explicit category membership can grant category-only access without workspace membership.
- Category author, category admin/owner, and workspace admin/owner may archive or soft-delete categories.
- Archived/deleted categories are hidden from normal reads except to author/admin.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key used by `auth-service`. |
| `INTERNAL_API_KEY` | Yes | Allows task-service legacy default category creation. |
| `PORT` | No | Service port, defaults to `8000`. |
| `POSTGRES_HOST` | In Compose | DB hostname. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `categories`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |
| `CATEGORY_SCHEMA_SYNC` | No | Local schema sync toggle. Use `false` in production. |
| `CATEGORY_INVITATION_TTL_HOURS` | No | Invitation lifetime, defaults to 168 hours. |
| `WORKSPACE_SERVICE_BASE_URL` | In Compose | Internal workspace-service URL. |
| `USER_SERVICE_BASE_URL` | In Compose | Internal user-service URL. |
| `RABBITMQ_URL` | No | AMQP URL for domain event publishing. |
| `RABBITMQ_EXCHANGE` | No | Topic exchange for domain events, defaults to `flowforge.events`. |
