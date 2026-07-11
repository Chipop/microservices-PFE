package com.flowforge.notification.event;

import org.springframework.stereotype.Component;

@Component
public class NoopNotificationEventConsumer {
    private final NotificationEventHandler handler;

    public NoopNotificationEventConsumer(NotificationEventHandler handler) {
        this.handler = handler;
    }

    public void consume(NotificationEvent event) {
        // Hook for a future RabbitMQ listener. Keep RabbitMQ dependencies out until broker wiring is added.
        handler.handle(event);
    }
}
