package com.flowforge.notification.service;

import com.flowforge.notification.model.Notification;
import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;
import com.flowforge.notification.repository.NotificationRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock
    private NotificationRepository repository;

    @InjectMocks
    private NotificationService service;

    @Test
    void listUsesDefaultPageAndCapsSize() {
        when(repository.findByRecipientUserIdAndDeletedAtIsNull(any(Long.class), any()))
                .thenReturn(new PageImpl<>(List.of(notification(7L))));

        var response = service.list(7L, null, 500);

        assertThat(response.getContent()).hasSize(1);
        var captor = ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        verify(repository).findByRecipientUserIdAndDeletedAtIsNull(any(Long.class), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(100);
        assertThat(captor.getValue().getSort().getOrderFor("createdAt").getDirection().name()).isEqualTo("DESC");
    }

    @Test
    void unreadCountIsScopedToUser() {
        when(repository.countByRecipientUserIdAndReadFalseAndDeletedAtIsNull(7L)).thenReturn(3L);

        var response = service.unreadCount(7L);

        assertThat(response.count()).isEqualTo(3L);
    }

    @Test
    void markReadSetsReadAtWhenUnread() {
        var notification = notification(7L);
        notification.setRead(false);
        when(repository.findByIdAndRecipientUserIdAndDeletedAtIsNull(10L, 7L)).thenReturn(Optional.of(notification));

        var response = service.markRead(7L, 10L);

        assertThat(response.isRead()).isTrue();
        assertThat(response.readAt()).isNotNull();
    }

    @Test
    void markReadIsIdempotent() {
        var readAt = Instant.parse("2026-01-01T00:00:00Z");
        var notification = notification(7L);
        notification.setRead(true);
        notification.setReadAt(readAt);
        when(repository.findByIdAndRecipientUserIdAndDeletedAtIsNull(10L, 7L)).thenReturn(Optional.of(notification));

        var response = service.markRead(7L, 10L);

        assertThat(response.isRead()).isTrue();
        assertThat(response.readAt()).isEqualTo(readAt);
    }

    @Test
    void markReadRejectsNotificationOwnedByAnotherUser() {
        when(repository.findByIdAndRecipientUserIdAndDeletedAtIsNull(10L, 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(7L, 10L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404 NOT_FOUND");
    }

    @Test
    void markAllReadDelegatesScopedBulkUpdate() {
        when(repository.markAllRead(any(Long.class), any(Instant.class))).thenReturn(4);

        var response = service.markAllRead(7L);

        assertThat(response.updated()).isEqualTo(4);
        verify(repository).markAllRead(any(Long.class), any(Instant.class));
    }

    @Test
    void deleteSoftDeletesOwnedNotification() {
        var notification = notification(7L);
        when(repository.findByIdAndRecipientUserIdAndDeletedAtIsNull(10L, 7L)).thenReturn(Optional.of(notification));

        service.delete(7L, 10L);

        assertThat(notification.getDeletedAt()).isNotNull();
    }

    @Test
    void createPersistsNotification() {
        when(repository.saveAndFlush(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(
                7L,
                NotificationType.TASK_ASSIGNED,
                "Assigned",
                "A task was assigned to you.",
                99L,
                RelatedResourceType.TASK
        );

        var captor = ArgumentCaptor.forClass(Notification.class);
        verify(repository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getRecipientUserId()).isEqualTo(7L);
        assertThat(captor.getValue().getType()).isEqualTo(NotificationType.TASK_ASSIGNED);
        assertThat(captor.getValue().getRelatedResourceId()).isEqualTo(99L);
        assertThat(captor.getValue().getRelatedResourceType()).isEqualTo(RelatedResourceType.TASK);
    }

    @Test
    void createFromEventReturnsExistingNotificationForDuplicateEvent() {
        var existing = notification(7L);
        when(repository.findBySourceEventIdAndRecipientUserIdAndType(
                "event-1",
                7L,
                NotificationType.TASK_ASSIGNED
        )).thenReturn(Optional.of(existing));

        var result = service.createFromEvent(
                "event-1",
                7L,
                NotificationType.TASK_ASSIGNED,
                "Assigned",
                "A task was assigned to you.",
                99L,
                RelatedResourceType.TASK
        );

        assertThat(result.created()).isFalse();
        assertThat(result.notification().recipientUserId()).isEqualTo(7L);
        verify(repository, never()).saveAndFlush(any(Notification.class));
    }

    @Test
    void createFromEventHandlesConcurrentDuplicateInsert() {
        var existing = notification(7L);
        when(repository.findBySourceEventIdAndRecipientUserIdAndType(
                "event-1",
                7L,
                NotificationType.TASK_ASSIGNED
        )).thenReturn(Optional.empty(), Optional.of(existing));
        when(repository.saveAndFlush(any(Notification.class))).thenThrow(new DataIntegrityViolationException("duplicate"));

        var result = service.createFromEvent(
                "event-1",
                7L,
                NotificationType.TASK_ASSIGNED,
                "Assigned",
                "A task was assigned to you.",
                99L,
                RelatedResourceType.TASK
        );

        assertThat(result.created()).isFalse();
        assertThat(result.notification().recipientUserId()).isEqualTo(7L);
    }

    private Notification notification(Long recipientUserId) {
        var notification = new Notification();
        notification.setRecipientUserId(recipientUserId);
        notification.setType(NotificationType.TASK_ASSIGNED);
        notification.setTitle("Assigned");
        notification.setMessage("A task was assigned to you.");
        notification.setRelatedResourceId(99L);
        notification.setRelatedResourceType(RelatedResourceType.TASK);
        notification.setCreatedAt(Instant.now());
        return notification;
    }
}
