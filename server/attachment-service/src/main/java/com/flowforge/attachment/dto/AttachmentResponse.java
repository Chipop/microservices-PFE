package com.flowforge.attachment.dto;

import com.flowforge.attachment.model.AttachmentTargetType;

import java.time.Instant;

public record AttachmentResponse(
        Long id,
        AttachmentTargetType targetType,
        Long targetId,
        String originalFilename,
        String contentType,
        Long sizeBytes,
        Long uploaderUserId,
        Instant createdAt
) {
}
