# Frontend architecture notes

## Layers

- `pages/`: route-level screens
- `components/`: reusable presentation and layout pieces
- `stores/`: application state and interaction logic
- `data/mockData.ts`: realistic prototype content
- `data/repositories.ts`: replaceable data access boundary
- `services/`: reserved for future HTTP and WebSocket clients

## Project service assumption

The backend contract does not yet define a project service. The prototype treats projects as workspace-owned entities with these expected operations:

- List/create projects within a workspace
- Load/update/archive/delete one project
- Project membership/lead metadata
- Project-scoped task queries
- Feature configuration for board, list, timeline, backlog and files

Do not embed project API calls directly in Vue components. Add them to a future `projectApiRepository` implementing the same interface as the mock repository.

## Notification WebSocket

`src/stores/notifications.ts` contains the mock lifecycle. Real integration should:

1. Load paginated history and unread count after login.
2. Connect after an access token is available.
3. Prepend `notification.created` payloads.
4. Increment unread count only for unread messages.
5. Reconnect with bounded exponential backoff.
6. Refresh the access token when required.
7. Close and clear notification state on logout.
