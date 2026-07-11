package com.flowforge.notification.event;

import com.flowforge.notification.dto.NotificationResponse;
import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;
import com.flowforge.notification.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationEventHandler {
    private final NotificationService notifications;

    public NotificationEventHandler(NotificationService notifications) {
        this.notifications = notifications;
    }

    public NotificationResponse handle(NotificationEvent event) {
        if (event.recipientUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notification recipient is required");
        }
        if (event.eventType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notification event type is required");
        }

        var content = defaultContent(event);
        return notifications.create(
                event.recipientUserId(),
                event.eventType(),
                firstNonBlank(event.title(), content.title()),
                firstNonBlank(event.message(), content.message()),
                event.relatedResourceId(),
                event.relatedResourceType() == null ? content.defaultRelatedResourceType() : event.relatedResourceType()
        );
    }

    private NotificationContent defaultContent(NotificationEvent event) {
        return switch (event.eventType()) {
            case TASK_ASSIGNED -> new NotificationContent(
                    "You were assigned a task",
                    "A task was assigned to you.",
                    RelatedResourceType.TASK
            );
            case TASK_COMPLETED -> new NotificationContent(
                    "Someone completed a task",
                    "A task was marked as completed.",
                    RelatedResourceType.TASK
            );
            case TASK_DEADLINE_APPROACHING -> new NotificationContent(
                    "Task deadline is approaching",
                    "A task deadline is coming up soon.",
                    RelatedResourceType.TASK
            );
            case WORKSPACE_INVITATION_CREATED -> new NotificationContent(
                    "Workspace invitation received",
                    "You received an invitation to join a workspace.",
                    RelatedResourceType.INVITATION
            );
            case WORKSPACE_ROLE_CHANGED -> new NotificationContent(
                    "Your workspace role changed",
                    "Your role in a workspace was updated.",
                    RelatedResourceType.WORKSPACE
            );
            case ATTACHMENT_ADDED -> new NotificationContent(
                    "Attachment added",
                    "A new attachment was added.",
                    RelatedResourceType.ATTACHMENT
            );
        };
    }

    private String firstNonBlank(String candidate, String fallback) {
        if (candidate == null || candidate.isBlank()) {
            return fallback;
        }
        return candidate.trim();
    }

    private record NotificationContent(String title, String message, RelatedResourceType defaultRelatedResourceType) {
    }
}
