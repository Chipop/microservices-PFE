# API Gateway

## Purpose

`api-gateway` is the single public API entry point for backend services. It is an nginx reverse proxy that routes API requests by URL prefix to the correct internal service on the Compose network.

The frontend and external clients should call the gateway instead of calling backend services directly.

## Runtime

- Runtime: nginx alpine image
- Container service: `api-gateway`
- Internal port: `80`
- Host port: `8080`
- Config file: `nginx.conf`
- Network: `todonet`

## Responsibilities

- Expose one stable API origin: `http://localhost:8080`.
- Route `/api/auth/` to `auth-service`.
- Route `/api/profiles/` to `user-service`.
- Route `/api/todos/` to `todo-service`.
- Forward common proxy headers.
- Provide a lightweight root health response.

## Routes

| Public path | Upstream | Purpose |
|---|---:|---|
| `/` | local nginx response | Health/info text. |
| `/api/auth/` | `auth-service:8000` | Registration, login, JWT, account security. |
| `/api/profiles/` | `user-service:8000` | Profile reads and internal profile creation. |
| `/api/todos/` | `todo-service:8000` | JWT-scoped todo CRUD. |

## Upstreams

Configured upstreams:

```nginx
upstream auth_service     { server auth-service:8000; }
upstream profiles_service { server user-service:8000; }
upstream todos_service    { server todo-service:8000; }
```

Docker/Podman Compose resolves these names through the `todonet` network.

## Request Headers

The gateway forwards:

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

These headers preserve client/origin context for Django and NestJS services.

## CORS

CORS is handled by the backend services, not by the gateway.

The gateway passes requests and responses through. Preflight behavior depends on the target service.

## Service Dependencies

Compose declares dependencies on:

- `auth-service`
- `user-service`
- `todo-service`

The gateway does not own data and has no database.

## Operational Notes

- Keep route prefixes stable because the frontend uses `VITE_GATEWAY_URL` plus fixed API paths.
- If a service name changes in Compose, update `nginx.conf` upstreams.
- If a new backend service is added, add a new upstream and `location` block here.
- The frontend is separate and served on `http://localhost:9000`.
