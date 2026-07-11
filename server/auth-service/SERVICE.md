# Auth Service

## Purpose

`auth-service` owns authentication and account-security data for the platform. It is the only service that stores user credentials, password hashes, refresh-token/session state, verification tokens, reset tokens, login attempts, and account lock state.

Other services do not read this database. They trust JWT access tokens signed by this service with the shared `JWT_SIGNING_KEY`.

## Runtime

- Framework: Django + Django REST Framework
- Container service: `auth-service`
- Internal port: `8000`
- Host port: `8002`
- Database: `auth-db`
- Database volume: `auth_pgdata`
- Gateway route: `/api/auth/`

The service starts with:

```bash
python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000
```

## Responsibilities

- User registration
- User login
- Password hashing through Django's user manager
- JWT access and refresh token issuing
- JWT verification endpoint
- Refresh-token blacklist support
- Logout and logout-all
- Password change
- Forgotten-password and reset flow
- Email verification
- Account activation token flow
- TOTP-style two-factor authentication
- Active auth session tracking
- Login-attempt tracking
- Account locking after repeated failed login attempts
- Profile creation handoff to `user-service` through `api-gateway`

## Owned Data

### `User`

Extends Django `AbstractUser`.

Important fields:

- `username`
- `email`
- `password`
- `is_active`
- `last_login`
- `email_verified_at`
- `failed_login_count`
- `locked_until`
- `two_factor_enabled`
- `two_factor_secret`

### `AuthSession`

Tracks active refresh-token sessions.

Important fields:

- `user`
- `refresh_jti`
- `ip_address`
- `user_agent`
- `created_at`
- `expires_at`
- `revoked_at`

### `AuthToken`

Stores hashed one-time tokens.

Purposes:

- `email_verification`
- `password_reset`
- `account_activation`

Raw tokens are only returned in debug/local mode. The database stores only `sha256` hashes.

### `LoginAttempt`

Tracks login outcomes by username, user, IP, user-agent, result, failure reason, and timestamp.

## Public API

All routes are mounted under `/api/auth/`.

| Method | Path | Auth | Description |
|---|---:|---:|---|
| `POST` | `/register/` | Public | Creates a user and sends profile payload to `user-service` through the gateway. |
| `POST` | `/login/` | Public | Authenticates credentials and returns `{ access, refresh }`. May return 202 if 2FA is required. |
| `POST` | `/refresh/` | Public | Exchanges refresh token for a new access token. |
| `POST` | `/verify/` | Public | Verifies a JWT using SimpleJWT. |
| `POST` | `/logout/` | JWT | Blacklists one refresh token and revokes its session. |
| `POST` | `/logout-all/` | JWT | Revokes all active sessions for the current user. |
| `POST` | `/password/change/` | JWT | Changes password after checking the old password, then revokes sessions. |
| `POST` | `/password/forgot/` | Public | Creates a password-reset token for an email if it exists. |
| `POST` | `/password/reset/confirm/` | Public | Consumes reset token and changes password. |
| `POST` | `/email/verify/request/` | JWT | Issues email-verification token. |
| `POST` | `/email/verify/confirm/` | Public | Consumes email-verification token. |
| `POST` | `/activation/request/` | JWT | Issues account-activation token. |
| `POST` | `/activation/confirm/` | Public | Consumes account-activation token. |
| `POST` | `/2fa/setup/` | JWT | Creates or returns TOTP secret and provisioning URI. |
| `POST` | `/2fa/confirm/` | JWT | Confirms a TOTP code and enables 2FA. |
| `POST` | `/2fa/disable/` | JWT | Verifies code and disables 2FA. |
| `GET` | `/sessions/` | JWT | Lists current user's auth sessions. |
| `DELETE` | `/sessions/{id}/` | JWT | Revokes one owned session. |

## Existing Compatibility Contract

The following endpoints preserve their existing public purpose:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`

Normal login still returns:

```json
{
  "access": "...",
  "refresh": "..."
}
```

If 2FA is enabled but no code is supplied, login returns HTTP 202:

```json
{
  "detail": "two_factor_required",
  "two_factor_required": true
}
```

## Inter-Service Communication

On registration, the service posts to:

```text
http://api-gateway/api/profiles/
```

Payload:

```json
{
  "auth_user_id": 1,
  "username": "alice",
  "email": "alice@example.com"
}
```

Header:

```text
X-Internal-Key: <INTERNAL_API_KEY>
```

This keeps `auth-service` from calling `user-service` directly and preserves gateway routing as the internal reception path.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | HS256 signing key used by all JWT validators. |
| `INTERNAL_API_KEY` | Yes | Shared internal key for profile creation. |
| `GATEWAY_URL` | No | Defaults to `http://api-gateway`. |
| `POSTGRES_HOST` | In Compose | Enables Postgres instead of SQLite. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `auth`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |
| `EMAIL_BACKEND` | No | Defaults to console backend. |
| `DEFAULT_FROM_EMAIL` | No | Defaults to `noreply@example.com`. |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | No | Defaults to `false`; when true, login requires verified email. |
| `AUTH_LOCK_THRESHOLD` | No | Failed login count before lock, defaults to `5`. |
| `AUTH_LOCK_MINUTES` | No | Lock duration, defaults to `15`. |
| `AUTH_RESET_TOKEN_MINUTES` | No | Password reset token lifetime, defaults to `30`. |
| `AUTH_VERIFY_TOKEN_HOURS` | No | Verification token lifetime, defaults to `24`. |

## Security Notes

- Passwords are hashed by Django's `create_user` and `set_password`.
- Password change and reset use Django password validators.
- Refresh tokens can be blacklisted through SimpleJWT token blacklist.
- One-time tokens are stored hashed, not raw.
- TOTP is implemented with standard HMAC-SHA1 time-step codes.
- `AUTH_REQUIRE_EMAIL_VERIFICATION` is off by default to avoid breaking current local flows.

## Local Commands

```bash
cd server/auth-service
JWT_SIGNING_KEY=this-is-a-much-longer-shared-secret-key-32plus python manage.py migrate
JWT_SIGNING_KEY=this-is-a-much-longer-shared-secret-key-32plus python manage.py runserver 0.0.0.0:8000
```

Under Compose/Podman Compose, migrations run automatically from the Docker entrypoint.
