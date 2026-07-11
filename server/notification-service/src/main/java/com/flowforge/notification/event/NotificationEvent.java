package com.flowforge.notification.event;

import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;

import java.time.Instant;

public record NotificationEvent(
        NotificationType eventType,
        Long recipientUserId,
        Long actorUserId,
        Long relatedResourceId,
        RelatedResourceType relatedResourceType,
        String title,
        String message,
        Instant occurredAt
) {
}
