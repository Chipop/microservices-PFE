package com.flowforge.notification.event;

import com.flowforge.notification.websocket.NotificationWebSocketPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
public class RabbitNotificationEventListener {
    private static final Logger logger = LoggerFactory.getLogger(RabbitNotificationEventListener.class);

    private final DomainNotificationEventMapper mapper;
    private final NotificationEventHandler handler;
    private final NotificationWebSocketPublisher webSocketPublisher;

    public RabbitNotificationEventListener(
            DomainNotificationEventMapper mapper,
            NotificationEventHandler handler,
            NotificationWebSocketPublisher webSocketPublisher
    ) {
        this.mapper = mapper;
        this.handler = handler;
        this.webSocketPublisher = webSocketPublisher;
    }

    @RabbitListener(queues = "${events.queue}")
    public void consume(@Payload DomainEvent domainEvent) {
        var notificationEvents = mapper.map(domainEvent);
        if (notificationEvents.isEmpty()) {
            logger.debug("Ignoring notification-irrelevant event {}", domainEvent == null ? null : domainEvent.eventType());
            return;
        }

        for (var notificationEvent : notificationEvents) {
            var creation = handler.handle(notificationEvent);
            if (creation.created()) {
                webSocketPublisher.publish(creation.notification());
            }
        }
    }
}
