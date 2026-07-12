# Email Service

Spring Boot service that sends external emails for FlowForge.

The service consumes RabbitMQ domain events from `flowforge.events`, renders an
email template, sends through SMTP, and records delivery attempts in its own
database. It does not own in-app notifications and is not intended to expose
frontend pages.

## Consumed Events

- `user.registered`
- `task.weekly_summary`

The service only binds to events that include a usable recipient email and any
required action data. Password-reset and workspace-invitation tokens are not
published on the shared domain event bus, so those emails remain owned by the
source workflow until a dedicated command/API contract exists.

## Environment

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port for actuator health, defaults to `8000`. |
| `POSTGRES_HOST` | Email database host. |
| `POSTGRES_PORT` | Email database port. |
| `POSTGRES_DB` | Email database name. |
| `POSTGRES_USER` | Email database user. |
| `POSTGRES_PASSWORD` | Email database password. |
| `RABBITMQ_URL` | AMQP URL. |
| `RABBITMQ_EXCHANGE` | Topic exchange, defaults to `flowforge.events`. |
| `EMAIL_QUEUE` | Queue name, defaults to `email-service.events`. |
| `EMAIL_DLX` | Dead-letter exchange, defaults to `email-service.events.dlx`. |
| `EMAIL_DLQ` | Dead-letter queue, defaults to `email-service.events.dlq`. |
| `SMTP_HOST` | SMTP server host. |
| `SMTP_PORT` | SMTP server port. |
| `SMTP_USERNAME` | SMTP username. |
| `SMTP_PASSWORD` | SMTP password. |
| `SMTP_FROM` | Default sender address. |
| `SMTP_AUTH_ENABLED` | Enables SMTP auth, defaults to `false`. |
| `SMTP_STARTTLS_ENABLED` | Enables STARTTLS, defaults to `true`. |
| `EMAIL_MAX_ATTEMPTS` | Send attempts per message, defaults to `3`. |
| `EMAIL_RETRY_BACKOFF_MS` | Retry backoff in milliseconds, defaults to `1000`. |
