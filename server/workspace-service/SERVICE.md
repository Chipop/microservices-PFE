# Workspace Service

## Purpose

`workspace-service` owns workspace membership, visibility, and invitation workflows. It is a
Spring Boot service built with Maven and Java 21, exposed through the gateway at
`/api/workspaces/`.

The service validates the JWT access token issued by `auth-service`, extracts
the `user_id` claim, and scopes every workspace operation through membership and
role checks. It does not store passwords, auth tokens, or user profile data.

## Runtime

- Framework: Spring Boot 3
- Build: Maven
- Java: 21
- Container service: `workspace-service`
- Internal port: `8000`
- Host port: `8004`
- Database: `workspaces-db`
- Database volume: `workspaces_pgdata`
- Gateway route: `/api/workspaces/`

## Responsibilities

- Create, update, archive, and soft-delete workspaces.
- Create a private personal workspace for each registered user.
- Manage private/public workspace visibility.
- Control whether logged-in non-members can contribute to public workspaces.
- Manage workspace members.
- Create, accept, and reject workspace invitations.
- Assign member roles.
- Remove members.
- Transfer workspace ownership.
- Validate workspace permissions from fixed roles.

## Owned Data

- `workspaces`
- `workspace_members`
- `workspace_invitations`

Workspace permissions are derived from fixed roles in code:

- `OWNER`
- `ADMIN`
- `MEMBER`
- `VIEWER`

## Public API

All routes require:

```text
Authorization: Bearer <access-token>
```

Workspace routes:

| Method | Path | Description |
|---|---:|---|
| `GET` | `/api/workspaces/` | List member workspaces plus public workspaces visible to the caller. |
| `POST` | `/api/workspaces/` | Create a workspace; caller becomes owner. |
| `GET` | `/api/workspaces/{id}` | Read one visible workspace. |
| `PATCH` | `/api/workspaces/{id}` | Update name/description. |
| `POST` | `/api/workspaces/{id}/archive` | Archive a workspace. |
| `DELETE` | `/api/workspaces/{id}` | Soft-delete a workspace. |
| `GET` | `/api/workspaces/{id}/permissions/me` | Return caller permissions for this workspace. |

Member routes:

- `GET /api/workspaces/{id}/members`
- `PATCH /api/workspaces/{id}/members/{userId}/role`
- `DELETE /api/workspaces/{id}/members/{userId}`
- `POST /api/workspaces/{id}/transfer-ownership`

Invitation routes:

- `GET /api/workspaces/{id}/invitations`
- `POST /api/workspaces/{id}/invitations`
- `POST /api/workspaces/invitations/{token}/accept`
- `POST /api/workspaces/invitations/{token}/reject`

Create workspace payload:

```json
{
  "name": "Engineering",
  "description": "Product engineering workspace",
  "visibility": "PRIVATE",
  "publicContributionsEnabled": false
}
```

Invite payload:

```json
{
  "email": "teammate@example.com",
  "role": "MEMBER"
}
```

The invitation creation response includes a plaintext `token` for local
development and integration testing. The database stores only a SHA-256 hash of
that token.

## Permissions

- `OWNER`: all actions.
- `ADMIN`: update workspace, invite members, remove non-owner members, and
  change non-owner roles.
- `MEMBER`: read workspace and members.
- `VIEWER`: read workspace and members.

- Private workspaces are visible only to active members.
- Public workspaces are visible to any logged-in user.
- Public workspaces with `publicContributionsEnabled=true` allow logged-in non-members to contribute.
- Archived or deleted workspaces reject mutations.
- Deleted workspaces and removed members are retained for audit.

## Internal API

`auth-service` calls this endpoint during registration:

```text
POST /api/workspaces/internal/personal
X-Internal-Key: <INTERNAL_API_KEY>
```

Payload:

```json
{
  "authUserId": 1,
  "username": "alice"
}
```

The endpoint is idempotent and creates or restores the user's private personal
workspace.

## Events

The service publishes domain events to the `flowforge.events` RabbitMQ topic
exchange through `WorkspaceEventPublisher`. Publishing is best-effort and runs
after transaction commit. Routing keys use `resource.event` format:

- `workspace.created`
- `workspace.invitation`
- `workspace.role_changed`

See [`../EVENTS.md`](../EVENTS.md) for the shared event envelope, payload
fields, and sensitive-data rules.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key used by `auth-service`. |
| `INTERNAL_API_KEY` | Yes | Allows internal personal workspace creation. |
| `PORT` | No | Service port, defaults to `8000`. |
| `POSTGRES_HOST` | In Compose | DB hostname. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `workspaces`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |
| `WORKSPACE_INVITATION_TTL_HOURS` | No | Invitation lifetime, defaults to 168 hours. |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated origins or `*` for local dev. |
| `RABBITMQ_URL` | No | AMQP URL for domain event publishing. |
| `RABBITMQ_EXCHANGE` | No | Topic exchange for domain events, defaults to `flowforge.events`. |

## Persistence

Schema is managed with Flyway. Hibernate runs with `ddl-auto: validate`, so the
service fails fast if migrations and entities drift.
