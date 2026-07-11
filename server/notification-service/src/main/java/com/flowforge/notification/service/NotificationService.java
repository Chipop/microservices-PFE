package com.flowforge.notification.service;

import com.flowforge.notification.dto.NotificationResponse;
import com.flowforge.notification.dto.ReadAllResponse;
import com.flowforge.notification.dto.UnreadCountResponse;
import com.flowforge.notification.model.Notification;
import com.flowforge.notification.model.NotificationType;
import com.flowforge.notification.model.RelatedResourceType;
import com.flowforge.notification.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class NotificationService {
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(Long userId, Integer page, Integer size) {
        var pageable = PageRequest.of(
                normalizedPage(page),
                normalizedSize(size),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return notifications.findByRecipientUserIdAndDeletedAtIsNull(userId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(Long userId) {
        return new UnreadCountResponse(notifications.countByRecipientUserIdAndReadFalseAndDeletedAtIsNull(userId));
    }

    @Transactional
    public NotificationResponse markRead(Long userId, Long notificationId) {
        var notification = findVisible(userId, notificationId);
        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
        }
        return toResponse(notification);
    }

    @Transactional
    public ReadAllResponse markAllRead(Long userId) {
        return new ReadAllResponse(notifications.markAllRead(userId, Instant.now()));
    }

    @Transactional
    public void delete(Long userId, Long notificationId) {
        var notification = findVisible(userId, notificationId);
        notification.setDeletedAt(Instant.now());
    }

    @Transactional
    public NotificationResponse create(
            Long recipientUserId,
            NotificationType type,
            String title,
            String message,
            Long relatedResourceId,
            RelatedResourceType relatedResourceType
    ) {
        var notification = new Notification();
        notification.setRecipientUserId(recipientUserId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRelatedResourceId(relatedResourceId);
        notification.setRelatedResourceType(relatedResourceType);
        return toResponse(notifications.save(notification));
    }

    private Notification findVisible(Long userId, Long notificationId) {
        return notifications.findByIdAndRecipientUserIdAndDeletedAtIsNull(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    }

    private int normalizedPage(Integer page) {
        if (page == null) {
            return 0;
        }
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be greater than or equal to 0");
        }
        return page;
    }

    private int normalizedSize(Integer size) {
        if (size == null) {
            return DEFAULT_PAGE_SIZE;
        }
        if (size < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Size must be greater than 0");
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getRecipientUserId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getRelatedResourceId(),
                notification.getRelatedResourceType(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }
}
