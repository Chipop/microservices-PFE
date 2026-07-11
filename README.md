# Tasks — Microservices Platform

A task management application built to demonstrate a **microservices architecture**:
four independent services under `server/` — two in **Django** (auth, profiles),
one in **NestJS** (tasks), and one in **Spring Boot** (workspaces) — behind an
**nginx API gateway**, **each with its own
PostgreSQL database** (database-per-service), with a **Quasar (Vue 3)**
single-page frontend.

```
                          ┌──────────────────────────────┐
   Browser (SPA :9000) ──▶│   API Gateway — nginx :8080   │
                          └──────────────┬───────────────┘
                                         │ routes by URL prefix
         ┌──────────────────────┬──────────────────────┬──────────────────────┐
         ▼                      ▼                      ▼                      ▼
  /api/auth/              /api/profiles/          /api/tasks/           /api/workspaces/
  auth-service            user-service            task-service          workspace-service
  (8002, Django)          (8001, Django)          (8003, NestJS)        (8004, Spring Boot)
  register / login / JWT  user profiles           JWT-scoped tasks      memberships
         │                      │                      │                      │
         ▼                      ▼                      ▼                      ▼
   auth-db  :5433          users-db :5434          tasks-db :5435       workspaces-db :5436
   (Postgres)                       (Postgres)                       (Postgres)
   one database per service — separate containers & volumes, share nothing

  On register, auth-service calls the gateway → user-service to create the profile (réception).
  Every service validates the same JWT, signed with one shared HS256 secret (`user_id` claim).
```

> **Note:** task management is now owned by `server/task-service/`. The former
> Django todo implementation remains in `server/legacy-todo-service/` for
> reference, but the active public contract is `/api/tasks/`.

---

## Technologies

| Layer | Stack |
|-------|-------|
| **Frontend** | Quasar 2 (Vue 3, `<script setup>`), TypeScript, Pinia (stores), Vue Router (file-based routing), Vite |
| **Auth + Profiles services** | Django 5.2, Django REST Framework, `djangorestframework-simplejwt` (JWT auth) |
| **Task service** | NestJS 11 (TypeScript), TypeORM, `class-validator`, `@nestjs/jwt` (stateless HS256 verification) |
| **Workspace service** | Spring Boot 3, Maven, Java 21, Spring Security resource server, Spring Data JPA, Flyway |
| **API Gateway** | nginx (alpine) — reverse proxy / single entry point |
| **Auth** | JWT (HS256), one shared `JWT_SIGNING_KEY` across all services; identity in the `user_id` claim |
| **Database** | PostgreSQL 16 — **one container per service** (`auth-db`, `users-db`, `tasks-db`, `workspaces-db`), each with its own volume; services share nothing |
| **Runtime** | Docker + Docker Compose (one network, `todonet`) |
| **Test** | `integration-tests/test_services.py` — cross-service end-to-end check (Python `requests`) |

---

## Projects

### `server/api-gateway/` — API Gateway (nginx)
The single public entry point. Routes incoming requests by URL prefix to the
right service and passes CORS headers through. Clients only ever talk to `:8080`.
- `/api/auth/` → auth-service
- `/api/profiles/` → user-service
- `/api/tasks/` → task-service
- `/api/workspaces/` → workspace-service

### `server/auth-service/` — Auth service (port 8002, Django)
Owns user accounts and credentials. Issues JWTs. Persists to its own `auth-db` Postgres container.
- `POST /api/auth/register/` — create an account (then calls the gateway to create the matching profile)
- `POST /api/auth/login/` — returns `{ access, refresh }`
- `POST /api/auth/refresh/` — new access token from a refresh token

### `server/user-service/` — User/Profile service (port 8001, Django)
Owns user profile metadata and profile-picture storage integration. A profile is
created via an internal call carrying the `X-Internal-Key`; authenticated users
can read and update safe profile fields. Persists metadata to its own `users-db`
Postgres container and stores profile-picture objects through the configured
storage backend.
- `GET /api/profiles/` — returns the caller's own profile (JWT-scoped)
- `POST /api/profiles/` — internal only (used by auth-service during registration)
- `PATCH /api/profiles/{id}/` — update safe profile fields
- `GET /api/profiles/public/{username}/` — public profile fields
- `POST / PUT / DELETE /api/profiles/picture/` — upload, replace, or remove profile picture

### `server/task-service/` — Task service (port 8003, NestJS)
Owns task CRUD plus task metadata such as statuses, priorities, deadlines,
assignments, tags, subtasks, dependencies, recurrence configuration, reminders,
Kanban columns, and saved filters. Every task is scoped to the `user_id` inside
the JWT, so users only ever see
their own (a cross-user id is a `404`). Auth is **stateless**: the service has no
users table — it verifies the shared HS256 JWT and trusts the `user_id` claim.
Persists to its own `tasks-db` Postgres container via TypeORM.
- `GET / POST /api/tasks/`
- `GET / PATCH / DELETE /api/tasks/{id}/`
- `POST /api/tasks/{id}/complete`
- `POST /api/tasks/{id}/archive`

  Task responses include `done` as a derived compatibility field, while the
  service stores richer task state internally.

### `server/workspace-service/` — Workspace service (port 8004, Spring Boot)
Owns workspace membership and invitation workflows. It validates the shared JWT,
extracts the `user_id` claim, and enforces fixed workspace roles internally.
Persists to its own `workspaces-db` Postgres container via Spring Data JPA and
Flyway.
- `GET / POST /api/workspaces/`
- `GET / PATCH / DELETE /api/workspaces/{id}`
- `POST /api/workspaces/{id}/archive`
- `GET / POST /api/workspaces/{id}/invitations`
- `POST /api/workspaces/invitations/{token}/accept`

### `server/legacy-todo-service/` — Former Todo service (Django, retired)
The original Django implementation, kept for reference. It is **commented out** in
`docker-compose.yml`; `task-service` now occupies port 8003 in its place.

### `frontend/` — Quasar SPA
Login, register, task CRUD and profile pages. All API calls go through the
single gateway origin (`http://localhost:8080`). State lives in Pinia stores
(`auth`, `tasks`); a route guard protects authenticated pages.

### `integration-tests/test_services.py` — End-to-end test
Walks the real cross-service flow (register → login → tasks CRUD → profile
scoping → internal-key guards) and prints PASS/FAIL per check.

---

## Usage

### 1. Start the backend (Docker)
From the repo root:

```bash
docker compose up -d --build
```

This starts all containers on the `todonet` network, including the Quasar
frontend built as static files and served by nginx. Each service's Postgres
comes up first (with a healthcheck); the service waits for its own DB before
migrating/starting:

| Container | URL |
|-----------|-----|
| `api-gateway` | http://localhost:8080 |
| `frontend` | http://localhost:9000 |
| `auth-service` | http://localhost:8002 |
| `user-service` | http://localhost:8001 |
| `task-service` | http://localhost:8003 |
| `workspace-service` | http://localhost:8004 |
| `auth-db` (PostgreSQL) | localhost:5433 (`todo` / `todo`) |
| `users-db` (PostgreSQL) | localhost:5434 (`todo` / `todo`) |
| `tasks-db` (PostgreSQL) | localhost:5435 (`todo` / `todo`) |
| `workspaces-db` (PostgreSQL) | localhost:5436 (`todo` / `todo`) |

> The gateway is the intended entry point. The individual `8001/8002/8003`
> ports are still exposed for convenience and for `integration-tests/test_services.py`.
>
> If you previously ran the Django todos service, clear the leftover container
> the first time: `docker compose up -d --build --remove-orphans`.

### 2. Run the frontend outside Docker, if needed

```bash
cd frontend
npm install
npx quasar dev      # opens http://localhost:9000
```

Register a new account in the UI, or log in with one you created.
When run through Docker Compose, the SPA is available at `http://localhost:9000`
and targets the gateway at `http://localhost:8080`. Because this is a Vite app,
`VITE_GATEWAY_URL` is a build-time value in `docker-compose.yml`.

### 3. Run the end-to-end test

```bash
pip install requests
python integration-tests/test_services.py
```

---

## Notes

- All services share the same `JWT_SIGNING_KEY` and `INTERNAL_API_KEY`
  (set in `docker-compose.yml`) — these are **dev secrets**, change them for
  any real deployment. `task-service` reads `JWT_SIGNING_KEY` and verifies the
  token with HS256 — it must match the key `auth-service` signs with.
- Persistence is **database-per-service**: each service has its own PostgreSQL
  container (`auth-db`, `users-db`, `tasks-db`, `workspaces-db`) with its own Docker volume
  (`auth_pgdata`, `users_pgdata`, `tasks_pgdata`, `workspaces_pgdata`). Services share nothing at the
  data layer — they communicate only over HTTP. Each DB is created by its
  container's `POSTGRES_DB`.
- `task-service` runs TypeORM with `TASK_SCHEMA_SYNC=true` in local Compose so
  task tables are created automatically on first boot. Set it to `false` and run
  explicit migrations before production.
- `workspace-service` uses Flyway migrations and Hibernate schema validation.
- CORS is enabled for local development (Django middleware / NestJS `enableCors`).
  Restrict it to the frontend origin before deploying.
- The Django services fall back to SQLite when `POSTGRES_HOST` is unset, so a
  bare `manage.py runserver` still works outside Docker.
