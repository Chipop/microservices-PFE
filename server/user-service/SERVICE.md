# User Service

## Purpose

`user-service` owns user profile data. It does not own authentication credentials, password hashes, refresh tokens, or login state. Those belong to `auth-service`.

The service stores a profile mirror keyed by `auth_user_id`, which is the user ID from `auth-service`.

## Runtime

- Framework: Django + Django REST Framework
- Container service: `user-service`
- Internal port: `8000`
- Host port: `8001`
- Database: `users-db`
- Database volume: `users_pgdata`
- Gateway route: `/api/profiles/`

The service starts with:

```bash
python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000
```

## Responsibilities

- Store profile records for authenticated users.
- Allow users to read only their own profile.
- Allow profile creation only through an internal service call from `auth-service`.
- Keep profile data separate from authentication data.

## Owned Data

### `Profile`

Fields:

- `auth_user_id`: unique integer ID from `auth-service`
- `username`
- `email`
- `created_at`

This service does not store passwords or JWT state.

## Public API

All routes are mounted under `/api/profiles/` through the gateway.

The implementation uses a DRF `ModelViewSet`, so the router exposes standard REST actions.

| Method | Path | Auth | Description |
|---|---:|---:|---|
| `GET` | `/api/profiles/` | JWT | Returns the current user's profile only. |
| `POST` | `/api/profiles/` | `X-Internal-Key` | Internal profile creation used by `auth-service`. |
| `GET` | `/api/profiles/{id}/` | JWT | Routed by DRF, but queryset remains scoped to current JWT user. |
| `PUT/PATCH/DELETE` | `/api/profiles/{id}/` | JWT | Exposed by `ModelViewSet`; scoped by queryset. |

## Authorization Model

For `POST`:

- No JWT authenticator is used.
- Request must include `X-Internal-Key`.
- Header value must match `INTERNAL_API_KEY`.

For all other methods:

- Uses `JWTTokenUserAuthentication`.
- Does not query `auth-service`.
- Trusts the `user_id` claim in the JWT.
- Queryset is filtered by `Profile.auth_user_id == JWT user_id`.

## Inter-Service Communication

`auth-service` calls this service through the gateway after registration:

```text
POST /api/profiles/
X-Internal-Key: <INTERNAL_API_KEY>
```

Payload:

```json
{
  "auth_user_id": 1,
  "username": "alice",
  "email": "alice@example.com"
}
```

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key for JWT validation. |
| `INTERNAL_API_KEY` | Yes | Allows internal profile creation. |
| `POSTGRES_HOST` | In Compose | Enables Postgres instead of SQLite. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `users`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |

## Boundary Rules

- Do not store passwords here.
- Do not issue or refresh JWTs here.
- Do not call the auth database directly.
- Treat `auth_user_id` as the identity boundary from `auth-service`.

## Local Commands

```bash
cd server/user-service
JWT_SIGNING_KEY=this-is-a-much-longer-shared-secret-key-32plus INTERNAL_API_KEY=INTERNAL-CHANGE-ME python manage.py migrate
JWT_SIGNING_KEY=this-is-a-much-longer-shared-secret-key-32plus INTERNAL_API_KEY=INTERNAL-CHANGE-ME python manage.py runserver 0.0.0.0:8000
```
