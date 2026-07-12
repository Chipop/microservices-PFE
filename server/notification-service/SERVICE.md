# Notification Service

Spring Boot service that owns in-app notifications for FlowForge users.

The service consumes notification-relevant RabbitMQ domain events from
`flowforge.events`, stores idempotent in-app notifications in its own database,
and pushes newly-created notifications to connected users through
`/ws/notifications`.

Runtime behavior:

- Queue: `notification-service.events`
- Dead-letter queue: `notification-service.events.dlq`
- WebSocket auth: `access_token` query parameter with the same JWT used by REST
- Realtime payload: `{ "type": "notification.created", "payload": ... }`

Consumed notification events:

- `task.assigned`
- `task.completed`
- `task.deadline_approaching`
- `user.mentioned`
- `workspace.role_changed`

Events must include an explicit recipient user id or recipient id list. Events
that only include an email address or target resource id are intentionally not
bound to this queue, because the notification service does not query other
service databases to infer recipients.
