# Todo Service

## Purpose

`todo-service` owns todo CRUD. It is a NestJS replacement for the former Django todo service and keeps the same gateway contract under `/api/todos/`.

The service is stateless for authentication. It validates the JWT access token issued by `auth-service`, extracts the `user_id` claim, and scopes all todo access to that user.

## Runtime

- Framework: NestJS
- ORM: TypeORM
- Container service: `todo-service`
- Internal port: `8000`
- Host port: `8003`
- Database: `todos-db`
- Database volume: `todos_pgdata`
- Gateway route: `/api/todos/`

The app listens on `PORT`, defaulting to `8000`.

## Responsibilities

- Create todos for the authenticated user.
- List todos for the authenticated user.
- Read one owned todo.
- Update one owned todo.
- Delete one owned todo.
- Reject requests without a valid JWT.
- Hide cross-user todos by returning `404`.

## Owned Data

### `Todo`

Stored table: `todos`

Fields:

- `id`
- `user_id`: copied from JWT `user_id`; never accepted from the client.
- `title`
- `done`
- `created_at`

Response shape intentionally excludes `user_id`:

```json
{
  "id": 1,
  "title": "first task",
  "done": false,
  "created_at": "2026-07-11T00:00:00.000Z"
}
```

## Public API

All routes require:

```text
Authorization: Bearer <access-token>
```

| Method | Path | Description |
|---|---:|---|
| `GET` | `/api/todos/` | List todos owned by the JWT user. |
| `POST` | `/api/todos/` | Create todo for the JWT user. |
| `GET` | `/api/todos/{id}/` | Read one owned todo. |
| `PATCH` | `/api/todos/{id}/` | Update one owned todo. |
| `DELETE` | `/api/todos/{id}/` | Delete one owned todo, returns 204. |

Create payload:

```json
{
  "title": "first task",
  "done": false
}
```

Patch payload:

```json
{
  "title": "renamed task",
  "done": true
}
```

Both `title` and `done` are optional for PATCH.

## Authentication

The `JwtAuthGuard`:

- Reads the `Authorization` header.
- Verifies the token with `JWT_SIGNING_KEY`.
- Requires HS256.
- Extracts `user_id`.
- Attaches `{ userId }` to the request.

The service does not call `auth-service` during request handling.

## Validation

NestJS global validation pipe is enabled:

- Unknown fields are rejected.
- Payloads are transformed.
- `title` must be a non-empty string with max length 200.
- `done` must be boolean when provided.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key for JWT validation. |
| `PORT` | No | App port, defaults to `8000`. |
| `POSTGRES_HOST` | In Compose | DB hostname. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `todos`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |

## Persistence

TypeORM currently uses:

```text
synchronize: true
```

This is convenient for development because the schema is auto-created. For production, replace this with explicit TypeORM migrations.

## Local Commands

```bash
cd server/todo-service
npm install
npm run build
npm run start:prod
```

For development:

```bash
npm run start:dev
```
