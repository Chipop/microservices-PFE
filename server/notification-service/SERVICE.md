# Notification Service

Spring Boot service that owns in-app notifications for FlowForge users.

RabbitMQ integration is intentionally deferred. Event handling is isolated behind
`NotificationEventHandler` and `NoopNotificationEventConsumer` so a future broker
listener can call the same domain service.
