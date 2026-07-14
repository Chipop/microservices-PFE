# Statistics Service

`statistics-service` exposes productivity metrics using task-service snapshots.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/statistics/overview` | Completion rate, totals, and status/category/priority distributions. |

Optional query filters: `workspace_id`, `category_id`, `priority`, `status`.
