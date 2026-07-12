package com.flowforge.notification.event;

import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
public class DomainNotificationEventMapper {
    public List<NotificationEvent> map(DomainEvent event) {
        if (event == null || event.eventType() == null) {
            return List.of();
        }

        var data = event.data() == null ? Map.<String, Object>of() : event.data();
        return switch (event.eventType()) {
            case "task.assigned" -> notification(
                    event,
                    NotificationType.TASK_ASSIGNED,
                    recipients(data, event.actorUserId(), "assigneeUserId", "recipientUserId"),
                    resourceId(event, data, "taskId"),
                    RelatedResourceType.TASK,
                    "You were assigned a task",
                    taskMessage(data, "A task was assigned to you.")
            );
            case "task.completed" -> notification(
                    event,
                    NotificationType.TASK_COMPLETED,
                    recipients(data, event.actorUserId(), "recipientUserId", "targetUserId", "assigneeUserId", "ownerUserId", "viewerUserIds"),
                    resourceId(event, data, "taskId"),
                    RelatedResourceType.TASK,
                    "Someone completed a task",
                    taskMessage(data, "A task was marked as completed.")
            );
            case "task.deadline_approaching" -> notification(
                    event,
                    NotificationType.TASK_DEADLINE_APPROACHING,
                    recipients(data, event.actorUserId(), "recipientUserId", "assigneeUserId", "ownerUserId", "viewerUserIds"),
                    resourceId(event, data, "taskId"),
                    RelatedResourceType.TASK,
                    "Task deadline is approaching",
                    taskMessage(data, "A task deadline is coming up soon.")
            );
            case "workspace.role_changed" -> notification(
                    event,
                    NotificationType.WORKSPACE_ROLE_CHANGED,
                    recipients(data, event.actorUserId(), "targetUserId", "recipientUserId"),
                    resourceId(event, data, "workspaceId"),
                    RelatedResourceType.WORKSPACE,
                    "Your workspace role changed",
                    roleMessage(data)
            );
            case "user.mentioned" -> notification(
                    event,
                    NotificationType.USER_MENTIONED,
                    recipients(data, event.actorUserId(), "mentionedUserId", "mentionedUserIds", "recipientUserId"),
                    resourceId(event, data, "commentId"),
                    RelatedResourceType.COMMENT,
                    "You were mentioned",
                    mentionMessage(data)
            );
            default -> List.of();
        };
    }

    private List<NotificationEvent> notification(
            DomainEvent event,
            NotificationType type,
            List<Long> recipientUserIds,
            Optional<Long> relatedResourceId,
            RelatedResourceType relatedResourceType,
            String title,
            String message
    ) {
        return recipientUserIds.stream().map(recipient -> new NotificationEvent(
                event.eventId(),
                type,
                recipient,
                event.actorUserId(),
                relatedResourceId.orElse(null),
                relatedResourceType,
                title,
                message,
                occurredAt(event)
        )).toList();
    }

    private List<Long> recipients(Map<String, Object> data, Long actorUserId, String... keys) {
        Set<Long> recipients = new LinkedHashSet<>();
        for (var key : keys) {
            recipients.addAll(numbers(data, key));
        }
        if (actorUserId != null && recipients.size() > 1) {
            recipients.remove(actorUserId);
        }
        return List.copyOf(recipients);
    }

    private Optional<Long> resourceId(DomainEvent event, Map<String, Object> data, String key) {
        return number(data, key).or(() -> event.resource() == null ? Optional.empty() : Optional.ofNullable(event.resource().id()));
    }

    private Optional<Long> number(Map<String, Object> data, String key) {
        var raw = data.get(key);
        if (raw instanceof Number number) {
            return Optional.of(number.longValue());
        }
        if (raw instanceof String text && !text.isBlank()) {
            try {
                return Optional.of(Long.parseLong(text));
            } catch (NumberFormatException ignored) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private List<Long> numbers(Map<String, Object> data, String key) {
        var raw = data.get(key);
        if (raw instanceof Iterable<?> values) {
            return iterableNumbers(values);
        }
        return number(data, key).map(List::of).orElseGet(List::of);
    }

    private List<Long> iterableNumbers(Iterable<?> values) {
        Set<Long> result = new LinkedHashSet<>();
        for (var value : values) {
            if (value instanceof Number number) {
                result.add(number.longValue());
            } else if (value instanceof String text && !text.isBlank()) {
                try {
                    result.add(Long.parseLong(text));
                } catch (NumberFormatException ignored) {
                    // Ignore malformed recipient ids from optional list fields.
                }
            }
        }
        return List.copyOf(result);
    }

    private Instant occurredAt(DomainEvent event) {
        if (event.occurredAt() == null || event.occurredAt().isBlank()) {
            return Instant.now();
        }
        return Instant.parse(event.occurredAt());
    }

    private String taskMessage(Map<String, Object> data, String fallback) {
        return string(data, "title")
                .map(title -> "Task: " + title)
                .orElse(fallback);
    }

    private String roleMessage(Map<String, Object> data) {
        return string(data, "role")
                .map(role -> "Your workspace role is now " + role + ".")
                .orElse("Your role in a workspace was updated.");
    }

    private String mentionMessage(Map<String, Object> data) {
        return string(data, "body")
                .map(body -> body.length() > 120 ? body.substring(0, 117) + "..." : body)
                .orElse("Someone mentioned you.");
    }

    private Optional<String> string(Map<String, Object> data, String key) {
        var raw = data.get(key);
        if (raw instanceof String text && !text.isBlank()) {
            return Optional.of(text.trim());
        }
        return Optional.empty();
    }
}
