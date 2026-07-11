package com.flowforge.notification.event;

import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;
import com.flowforge.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationEventHandlerTest {
    @Mock
    private NotificationService notifications;

    @InjectMocks
    private NotificationEventHandler handler;

    @Test
    void usesProvidedTitleAndMessage() {
        var event = new NotificationEvent(
                NotificationType.ATTACHMENT_ADDED,
                7L,
                3L,
                99L,
                RelatedResourceType.ATTACHMENT,
                "Custom title",
                "Custom message",
                Instant.now()
        );

        handler.handle(event);

        verify(notifications).create(
                7L,
                NotificationType.ATTACHMENT_ADDED,
                "Custom title",
                "Custom message",
                99L,
                RelatedResourceType.ATTACHMENT
        );
    }

    @Test
    void usesDefaultContentForKnownEvents() {
        var event = new NotificationEvent(
                NotificationType.WORKSPACE_INVITATION_CREATED,
                7L,
                3L,
                99L,
                null,
                null,
                null,
                Instant.now()
        );

        handler.handle(event);

        verify(notifications).create(
                7L,
                NotificationType.WORKSPACE_INVITATION_CREATED,
                "Workspace invitation received",
                "You received an invitation to join a workspace.",
                99L,
                RelatedResourceType.INVITATION
        );
    }

    @Test
    void rejectsMissingRecipient() {
        var event = new NotificationEvent(
                NotificationType.TASK_ASSIGNED,
                null,
                3L,
                99L,
                RelatedResourceType.TASK,
                null,
                null,
                Instant.now()
        );

        assertThatThrownBy(() -> handler.handle(event))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400 BAD_REQUEST");
    }
}
