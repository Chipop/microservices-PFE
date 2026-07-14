package com.flowforge.notification.websocket;

import com.flowforge.notification.dto.NotificationResponse;
import org.springframework.stereotype.Component;

@Component
public class NotificationWebSocketPublisher {
    private final NotificationWebSocketHandler handler;

    public NotificationWebSocketPublisher(NotificationWebSocketHandler handler) {
        this.handler = handler;
    }

    public void publish(NotificationResponse notification) {
        handler.send(
                notification.recipientUserId(),
                new NotificationWebSocketHandler.WebSocketEvent("notification.created", notification)
        );
    }
}
