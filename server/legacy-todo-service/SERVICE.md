# Legacy Todo Service

## Purpose

`legacy-todo-service` is the retired Django implementation of the todo API. It is kept in the repository for reference and rollback, but it is commented out in `docker-compose.yml`.

The active todo runtime is `server/todo-service`, the NestJS implementation.

## Runtime

- Framework: Django + Django REST Framework
- Container service: currently inactive
- Former internal port: `8000`
- Former host port: `8003`
- Former gateway route: `/api/todos/`

## Responsibilities When Active

- Create todos for the authenticated user.
- List todos for the authenticated user.
- Read, update, and delete todos through DRF `ModelViewSet`.
- Scope todos to the JWT `user_id` claim.

## Owned Data

### `Todo`

Fields:

- `id`
- `user_id`
- `title`
- `done`
- `created_at`

The model mirrors the active NestJS todo table shape.

## Public API When Active

Mounted under `/api/todos/`.

| Method | Path | Description |
|---|---:|---|
| `GET` | `/api/todos/` | List todos owned by JWT user. |
| `POST` | `/api/todos/` | Create todo for JWT user. |
| `GET` | `/api/todos/{id}/` | Read one owned todo. |
| `PUT/PATCH` | `/api/todos/{id}/` | Update one owned todo. |
| `DELETE` | `/api/todos/{id}/` | Delete one owned todo. |

## Authentication

Uses DRF authentication and permissions:

- Requires authenticated requests.
- Reads `user_id` from `request.auth`.
- Filters queryset by `Todo.user_id == JWT user_id`.
- Saves `user_id` server-side in `perform_create`.

## Current Status

Inactive by default.

In `docker-compose.yml`, the legacy service is commented out because `todo-service` now owns port `8003` and the gateway upstream contract.

To temporarily restore it, the Compose service would need to be uncommented and the active NestJS `todo-service` disabled or moved off port `8003`.

## Boundary Rules

- This service should not receive new feature work unless the project intentionally rolls back from NestJS.
- Keep it as a reference implementation for behavior parity.
- Do not run it at the same host port as `todo-service`.
