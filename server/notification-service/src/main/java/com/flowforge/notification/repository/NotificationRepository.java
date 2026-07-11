package com.flowforge.notification.repository;

import com.flowforge.notification.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByRecipientUserIdAndDeletedAtIsNull(Long recipientUserId, Pageable pageable);

    long countByRecipientUserIdAndReadFalseAndDeletedAtIsNull(Long recipientUserId);

    Optional<Notification> findByIdAndRecipientUserIdAndDeletedAtIsNull(Long id, Long recipientUserId);

    @Modifying
    @Query("""
            update Notification notification
            set notification.read = true,
                notification.readAt = :readAt
            where notification.recipientUserId = :recipientUserId
              and notification.deletedAt is null
              and notification.read = false
            """)
    int markAllRead(@Param("recipientUserId") Long recipientUserId, @Param("readAt") Instant readAt);
}
