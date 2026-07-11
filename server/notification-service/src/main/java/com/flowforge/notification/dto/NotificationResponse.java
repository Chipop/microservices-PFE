package com.flowforge.notification.dto;

import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        Long recipientUserId,
        NotificationType type,
        String title,
        String message,
        Long relatedResourceId,
        RelatedResourceType relatedResourceType,
        boolean isRead,
        Instant createdAt,
        Instant readAt
) {
}
