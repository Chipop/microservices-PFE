package com.flowforge.attachment.repository;

import com.flowforge.attachment.model.Attachment;
import com.flowforge.attachment.model.AttachmentTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByTargetTypeAndTargetIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            AttachmentTargetType targetType,
            Long targetId
    );

    Optional<Attachment> findByIdAndDeletedAtIsNull(Long id);
}
