package com.flowforge.notification.event;

import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DomainNotificationEventMapperTest {
    private final DomainNotificationEventMapper mapper = new DomainNotificationEventMapper();

    @Test
    void mapsTaskAssignedToAssigneeNotification() {
        var event = new DomainEvent(
                "event-1",
                "task.assigned",
                "2026-07-12T12:00:00Z",
                "task-service",
                1L,
                new DomainEvent.Resource("task", 42L),
                Map.of("assigneeUserId", 9, "taskId", 42)
        );

        var mapped = mapper.map(event);

        assertThat(mapped).hasSize(1);
        assertThat(mapped.getFirst().eventType()).isEqualTo(NotificationType.TASK_ASSIGNED);
        assertThat(mapped.getFirst().recipientUserId()).isEqualTo(9L);
        assertThat(mapped.getFirst().relatedResourceType()).isEqualTo(RelatedResourceType.TASK);
    }

    @Test
    void ignoresEventWithoutRecipient() {
        var event = new DomainEvent(
                "event-2",
                "attachment.added",
                "2026-07-12T12:00:00Z",
                "attachment-service",
                1L,
                new DomainEvent.Resource("attachment", 55L),
                Map.of("filename", "brief.pdf")
        );

        assertThat(mapper.map(event)).isEmpty();
    }

    @Test
    void mapsTaskCompletedToViewersExceptActor() {
        var event = new DomainEvent(
                "event-3",
                "task.completed",
                "2026-07-12T12:00:00Z",
                "task-service",
                1L,
                new DomainEvent.Resource("task", 42L),
                Map.of("viewerUserIds", java.util.List.of(1, 7, 9), "taskId", 42, "title", "Ship release")
        );

        var mapped = mapper.map(event);

        assertThat(mapped).extracting(NotificationEvent::recipientUserId).containsExactly(7L, 9L);
        assertThat(mapped).allMatch(notification -> notification.eventType() == NotificationType.TASK_COMPLETED);
    }
}
