# Attachment Service

## Purpose

`attachment-service` owns file attachment metadata and secure download links for
task and comment attachments. It is a Spring Boot service built with Maven and Java 21,
exposed through the gateway at `/api/attachments/`.

The service validates the JWT access token issued by `auth-service`, extracts
the `user_id` claim, and checks task visibility by calling `task-service` with
the caller's bearer token. It does not read task, profile, workspace, or auth
databases directly.

## Runtime

- Framework: Spring Boot 3
- Build: Maven
- Java: 21
- Container service: `attachment-service`
- Internal port: `8000`
- Host port: `8005`
- Database: `attachments-db`
- Database volume: `attachments_pgdata`
- Gateway route: `/api/attachments/`
- Blob storage: private Azure Blob Storage container

## Responsibilities

- Upload task and comment attachment files.
- Store attachment metadata in its own database.
- Validate file content types and sizes.
- Check task access permissions through `task-service`.
- Generate short-lived secure download links.
- Soft-delete attachment metadata while retaining Azure blobs for audit.
- Publish RabbitMQ domain events after attachment metadata is saved.

## Owned Data

The service owns the `attachments` table:

- `uploader_user_id`
- `target_type`
- `target_id`
- `parent_task_id`
- `original_filename`
- `stored_blob_key`
- `content_type`
- `size_bytes`
- `created_at`
- `deleted_at`

The database stores metadata only. File bytes are stored in Azure Blob Storage.

## Public API

All routes require:

```text
Authorization: Bearer <access-token>
```

Task attachment routes:

| Method | Path | Description |
|---|---:|---|
| `POST` | `/api/attachments/tasks/{taskId}` | Upload an attachment to a visible task. |
| `GET` | `/api/attachments/tasks/{taskId}` | List non-deleted attachments for a visible task. |
| `POST` | `/api/attachments/tasks/{taskId}/comments/{commentId}` | Upload an attachment to a visible comment. |
| `GET` | `/api/attachments/tasks/{taskId}/comments/{commentId}` | List non-deleted attachments for a visible comment. |
| `GET` | `/api/attachments/{attachmentId}` | Read attachment metadata after target access is verified. |
| `POST` | `/api/attachments/{attachmentId}/download-link` | Generate a short-lived Azure Blob read URL. |
| `DELETE` | `/api/attachments/{attachmentId}` | Soft-delete an attachment. Uploader or workspace admin only. |

Upload uses multipart form data:

```text
file=<attachment file>
```

Example metadata response:

```json
{
  "id": 1,
  "targetType": "TASK",
  "targetId": 42,
  "parentTaskId": 42,
  "originalFilename": "spec.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 12345,
  "uploaderUserId": 7,
  "createdAt": "2026-07-11T00:00:00Z"
}
```

Download link response:

```json
{
  "url": "https://...",
  "expiresAt": "2026-07-11T00:15:00Z"
}
```

## Permissions

- Every operation validates the caller's JWT locally.
- For task attachments, the service calls `GET /api/tasks/{taskId}/permissions`
  on `task-service` with the same bearer token.
- For comment attachments, it calls
  `GET /api/tasks/{taskId}/comments/{commentId}/permissions`.
- A task-service `200` allows the attachment operation.
- A task-service `404` is returned as `404 Task not found`.
- The original uploader or workspace admin can delete an attachment.
- Cross-service database access is not allowed.

## Storage

Blob keys use this shape:

```text
attachments/{uploaderUserId}/{uuid}/{safeOriginalFilename}
```

The Azure container should remain private. Clients never receive raw blob keys;
they receive signed read URLs only after permission checks. Deleted attachments
keep their Azure blobs for audit and traceability.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `JWT_SIGNING_KEY` | Yes | Shared HS256 key used by `auth-service`. |
| `PORT` | No | Service port, defaults to `8000`. |
| `POSTGRES_HOST` | In Compose | DB hostname. |
| `POSTGRES_PORT` | In Compose | DB port, defaults to `5432`. |
| `POSTGRES_DB` | In Compose | DB name, defaults to `attachments`. |
| `POSTGRES_USER` | In Compose | DB user, defaults to `todo`. |
| `POSTGRES_PASSWORD` | In Compose | DB password, defaults to `todo`. |
| `TASK_SERVICE_BASE_URL` | In Compose | Internal task-service URL. |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated origins or `*` for local dev. |
| `ATTACHMENT_MAX_BYTES` | No | Max upload size, default `10485760`. |
| `ATTACHMENT_ALLOWED_CONTENT_TYPES` | No | Comma-separated MIME allowlist. |
| `ATTACHMENT_SIGNED_URL_TTL_SECONDS` | No | Download URL lifetime, default `900`. |
| `ATTACHMENT_KEY_PREFIX` | No | Blob key prefix, default `attachments`. |
| `AZURE_STORAGE_CONTAINER` | Yes | Blob container name. |
| `AZURE_STORAGE_CONNECTION_STRING` | One auth option | Connection string for Azure Blob Storage. |
| `AZURE_STORAGE_ACCOUNT_URL` | One auth option | Account URL for workload identity. |
| `AZURE_STORAGE_ACCOUNT_NAME` | Optional | Account name for SAS generation if needed. |
| `AZURE_STORAGE_ACCOUNT_KEY` | Optional | Enables account-key SAS signed URLs. |
| `RABBITMQ_URL` | No | AMQP URL for domain event publishing. |
| `RABBITMQ_EXCHANGE` | No | Topic exchange for domain events, defaults to `flowforge.events`. |

## Events

The service publishes `attachment.added` after attachment metadata is saved and
the surrounding transaction commits. A broker failure is logged and does not
fail the upload response.

See [`../EVENTS.md`](../EVENTS.md) for the shared event envelope, routing key,
payload fields, and sensitive-data rules.

## Persistence

Schema is managed with Flyway. Hibernate runs with `ddl-auto: validate`, so the
service fails fast if migrations and entities drift.

## Boundary Rules

- Do not store file bytes in Postgres.
- Do not expose Azure blob keys to API clients.
- Do not call another service's database.
- Do not let clients choose `uploader_user_id` or storage keys.
- Treat `auth-service` `user_id` as the identity boundary.
- Do not delete Azure blobs for user-requested attachment deletes.

## Local Commands

```bash
cd server/attachment-service
JWT_SIGNING_KEY=this-is-a-much-longer-shared-secret-key-32plus \
POSTGRES_HOST=localhost POSTGRES_PORT=5437 POSTGRES_DB=attachments \
POSTGRES_USER=todo POSTGRES_PASSWORD=todo \
AZURE_STORAGE_CONTAINER=flowforge-bucket \
AZURE_STORAGE_CONNECTION_STRING='...' \
mvn spring-boot:run
```
