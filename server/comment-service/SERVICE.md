# Comment Service

`comment-service` owns task comments. It checks task visibility through `task-service`
and publishes `task.comment.*` domain events.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/comments?task_id={taskId}` | List visible comments for a task. |
| `POST` | `/api/comments` | Create a comment with `task_id` and `body`. |
| `GET` | `/api/comments/{id}` | Read one visible comment. |
| `PATCH` | `/api/comments/{id}` | Update the author's comment body. |
| `DELETE` | `/api/comments/{id}` | Soft-delete a comment. |

Internal:

- `GET /api/comments/internal/search-snapshots`
