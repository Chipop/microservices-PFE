# search-service

Spring Boot service that owns the Elasticsearch search read model for FlowForge.
It stores searchable copies of task, workspace, user profile, and task-comment
data. It does not own source records.

## Routes

All public routes require the platform JWT and are exposed through the gateway:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/search?q=backend` | Global search across tasks, workspaces, users, and comments. |
| `GET` | `/api/search/tasks?q=backend&status=todo&priority=high` | Task search. |
| `GET` | `/api/search/workspaces?q=university` | Workspace search. |
| `GET` | `/api/search/users?q=hicham` | Public profile search. |
| `GET` | `/api/search/comments?q=backend` | Comment body search. |
| `POST` | `/api/search/internal/reindex` | Internal backfill from producer snapshot APIs. |

## Event inputs

Consumes RabbitMQ events from `flowforge.events` through the durable queue
`search-service.events`.

Expected routing keys:

- `task.created`
- `task.updated`
- `task.deleted`
- `task.comment.created`
- `task.comment.updated`
- `task.comment.deleted`
- `workspace.created`
- `workspace.updated`
- `workspace.deleted`
- `workspace.access_updated`
- `user.profile.created`
- `user.profile.updated`

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key used by `auth-service`. |
| `INTERNAL_API_KEY` | Yes for reindex | Protects internal reindex endpoint. |
| `ELASTICSEARCH_URL` | Yes in Compose | Elasticsearch base URL. |
| `RABBITMQ_URL` | Yes in Compose | RabbitMQ AMQP URL. |
| `RABBITMQ_EXCHANGE` | No | Defaults to `flowforge.events`. |
| `SEARCH_QUEUE` | No | Defaults to `search-service.events`. |
| `SEARCH_INDEX_PREFIX` | No | Defaults to `flowforge`. |

## Authorization

Search applies Elasticsearch filters using the authenticated `user_id`.
Task/comment/workspace documents must include ACL fields such as
`viewerUserIds`, `memberUserIds`, `ownerUserId`, or `authorUserId`.
