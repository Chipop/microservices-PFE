# User Service

## Purpose

`user-service` owns profile data for platform users. It does not own authentication credentials, password hashes, refresh tokens, or login state. Those belong to `auth-service`.

The service stores profile metadata in its own database and stores profile-picture objects through a configurable storage backend. The first production storage backend is Azure Blob Storage, selected by environment configuration.

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

- Create profiles after registration through an internal service call from `auth-service`.
- Return the authenticated user's private profile.
- Update safe profile fields.
- Return public profile information by username.
- Store profile-picture objects through the configured storage backend.
- Return signed/read URLs for profile pictures.
- Manage biography, timezone, language, and user preferences.
- Keep profile data separate from authentication data.

## Owned Data

### `Profile`

Fields:

- `auth_user_id`: unique integer ID from `auth-service`
- `username`
- `email`
- `profile_picture_key`
- `profile_picture_content_type`
- `profile_picture_size`
- `biography`
- `timezone`
- `language`
- `preferences`
- `created_at`
- `updated_at`

The service stores profile-picture metadata only. The binary image object is stored through the configured storage backend.

This service does not store passwords, refresh tokens, access tokens, or auth sessions.

## Public API

All routes are mounted under `/api/profiles/` through the gateway.

| Method | Path | Auth | Description |
|---|---:|---:|---|
| `GET` | `/api/profiles/` | JWT | Returns the current user's private profile. |
| `POST` | `/api/profiles/` | `X-Internal-Key` | Internal profile creation used by `auth-service`. |
| `GET` | `/api/profiles/{id}/` | JWT | Reads an owned profile by router ID. |
| `PATCH` | `/api/profiles/{id}/` | JWT | Updates safe editable profile fields. |
| `PUT` | `/api/profiles/{id}/` | JWT | Replaces safe editable profile fields. |
| `GET` | `/api/profiles/public/{username}/` | Public | Returns safe public profile fields. |
| `POST/PUT` | `/api/profiles/picture/` | JWT | Uploads/replaces the current user's profile picture. |
| `DELETE` | `/api/profiles/picture/` | JWT | Deletes the current user's profile picture. |

## Internal Profile Creation

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

The internal create endpoint is the only place where `auth_user_id` and `email` should be set from another service.

## Private Profile Response

Authenticated reads include private profile fields:

```json
{
  "id": 1,
  "auth_user_id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "profile_picture_url": "https://...",
  "biography": "Product builder",
  "timezone": "Africa/Casablanca",
  "language": "en",
  "preferences": {
    "theme": "dark"
  },
  "created_at": "2026-07-11T00:00:00Z",
  "updated_at": "2026-07-11T00:00:00Z"
}
```

Safe editable fields:

- `username`
- `biography`
- `timezone`
- `language`
- `preferences`

The API does not allow users to update `auth_user_id`, `email`, profile-picture storage keys, or timestamps through the normal update endpoint.

## Public Profile Response

Public reads use username:

```text
GET /api/profiles/public/{username}/
```

Public response fields:

```json
{
  "username": "alice",
  "biography": "Product builder",
  "timezone": "Africa/Casablanca",
  "language": "en",
  "profile_picture_url": "https://...",
  "joined_date": "2026-07-11T00:00:00Z"
}
```

Public responses do not expose:

- `auth_user_id`
- `email`
- `preferences`
- storage object keys
- internal database IDs

## Profile Picture Upload

Upload endpoint:

```text
POST /api/profiles/picture/
Content-Type: multipart/form-data
Authorization: Bearer <access-token>
```

Form field:

```text
file=<image file>
```

Validation is configured by environment:

- maximum byte size
- allowed content types

The service uploads the object first. It updates database metadata only after storage upload succeeds. Replacing a picture deletes the old object after the new object is stored and metadata is saved.

Delete endpoint:

```text
DELETE /api/profiles/picture/
Authorization: Bearer <access-token>
```

Delete is idempotent from the client perspective.

## Storage Interface

Profile-picture storage goes through `profiles.storage.ProfileStorage`.

Required backend methods:

- `build_key(auth_user_id, filename)`
- `upload(key, file_obj, content_type)`
- `delete(key)`
- `get_read_url(key)`

Implemented backends:

- `local`: filesystem backend for local development.
- `azure`: Azure Blob Storage backend.

Add future cloud providers by implementing the same interface and selecting them from `PROFILE_STORAGE_BACKEND`.

## Environment Variables

### Service/Auth

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key for JWT validation. |
| `INTERNAL_API_KEY` | Yes | Allows internal profile creation. |
| `POSTGRES_HOST` | In Compose/K8s | Enables Postgres instead of SQLite. |
| `POSTGRES_PORT` | In Compose/K8s | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose/K8s | DB name, defaults to `users`. |
| `POSTGRES_USER` | In Compose/K8s | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose/K8s | DB password, defaults to `todo`. |

### Profile Storage

| Variable | Required | Purpose |
|---|---:|---|
| `PROFILE_STORAGE_BACKEND` | Yes | `azure` for production, `local` for development. |
| `PROFILE_PICTURE_MAX_BYTES` | No | Max upload size; default `2097152`. |
| `PROFILE_PICTURE_ALLOWED_CONTENT_TYPES` | No | Comma-separated MIME list; default `image/jpeg,image/png,image/webp`. |
| `PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS` | No | Signed/read URL TTL; default `900`. |
| `PROFILE_PICTURE_KEY_PREFIX` | No | Object key prefix; default `profile-pictures`. |

### Azure Blob Storage

| Variable | Required for Azure | Purpose |
|---|---:|---|
| `AZURE_STORAGE_CONTAINER` | Yes | Blob container name. |
| `AZURE_STORAGE_CONNECTION_STRING` | One auth option | Connection string for local/dev or secret-based deployments. |
| `AZURE_STORAGE_ACCOUNT_URL` | One auth option | Account URL for managed identity/workload identity patterns. |
| `AZURE_STORAGE_ACCOUNT_NAME` | Optional | Account name for SAS generation if not inferred. |
| `AZURE_STORAGE_ACCOUNT_KEY` | Optional | Enables account-key SAS signed URLs. |

### Local Development Storage

| Variable | Required for local | Purpose |
|---|---:|---|
| `PROFILE_STORAGE_LOCAL_ROOT` | No | Filesystem root for local files. |
| `PROFILE_STORAGE_LOCAL_BASE_URL` | No | Base URL returned for local picture reads. |

## Kubernetes Deployment Notes

- Use `ConfigMap` for non-secret values:
  - `PROFILE_STORAGE_BACKEND`
  - `PROFILE_PICTURE_MAX_BYTES`
  - `PROFILE_PICTURE_ALLOWED_CONTENT_TYPES`
  - `PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS`
  - `PROFILE_PICTURE_KEY_PREFIX`
  - `AZURE_STORAGE_CONTAINER`
  - `AZURE_STORAGE_ACCOUNT_URL`
- Use `Secret` for sensitive values:
  - `JWT_SIGNING_KEY`
  - `INTERNAL_API_KEY`
  - database password
  - `AZURE_STORAGE_CONNECTION_STRING`
  - `AZURE_STORAGE_ACCOUNT_KEY`
- Prefer Azure workload identity or managed identity where available.
- Keep the storage container private.
- Do not mount persistent volumes for profile pictures in production; use object storage.
- Run migrations as an init job or controlled release step before rolling out app pods.

## Boundary Rules

- Do not store passwords here.
- Do not issue or refresh JWTs here.
- Do not call the auth database directly.
- Do not let other services write profile storage objects directly.
- Treat `auth_user_id` as the identity boundary from `auth-service`.
- Store binary media in object storage, not in Postgres.

## Local Commands

```bash
cd server/user-service
JWT_SIGNING_KEY=this-is-a-much-longer-shared-secret-key-32plus INTERNAL_API_KEY=INTERNAL-CHANGE-ME python manage.py migrate
JWT_SIGNING_KEY=this-is-a-much-longer-shared-secret-key-32plus INTERNAL_API_KEY=INTERNAL-CHANGE-ME python manage.py runserver 0.0.0.0:8000
```
