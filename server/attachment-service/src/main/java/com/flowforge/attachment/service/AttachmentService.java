package com.flowforge.attachment.service;

import com.flowforge.attachment.config.AttachmentProperties;
import com.flowforge.attachment.dto.AttachmentResponse;
import com.flowforge.attachment.dto.DownloadLinkResponse;
import com.flowforge.attachment.model.Attachment;
import com.flowforge.attachment.model.AttachmentTargetType;
import com.flowforge.attachment.repository.AttachmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AttachmentService {
    private final AttachmentRepository attachments;
    private final AttachmentStorage storage;
    private final TargetAccessService targetAccess;
    private final AttachmentProperties properties;
    private final Set<String> allowedContentTypes;

    public AttachmentService(
            AttachmentRepository attachments,
            AttachmentStorage storage,
            TargetAccessService targetAccess,
            AttachmentProperties properties
    ) {
        this.attachments = attachments;
        this.storage = storage;
        this.targetAccess = targetAccess;
        this.properties = properties;
        this.allowedContentTypes = Arrays.stream(properties.allowedContentTypes().split(","))
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Transactional
    public AttachmentResponse uploadTaskAttachment(
            Long userId,
            Long taskId,
            MultipartFile file,
            String authorizationHeader
    ) {
        targetAccess.requireAccess(AttachmentTargetType.TASK, taskId, authorizationHeader);
        validateFile(file);

        var contentType = normalizedContentType(file);
        var originalFilename = file.getOriginalFilename().trim();
        var key = storage.buildKey(userId, originalFilename);
        try {
            storage.upload(key, file, contentType);
            var attachment = new Attachment();
            attachment.setUploaderUserId(userId);
            attachment.setTargetType(AttachmentTargetType.TASK);
            attachment.setTargetId(taskId);
            attachment.setOriginalFilename(originalFilename);
            attachment.setStoredBlobKey(key);
            attachment.setContentType(contentType);
            attachment.setSizeBytes(file.getSize());
            return toResponse(attachments.save(attachment));
        } catch (IOException exc) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Attachment upload failed");
        } catch (RuntimeException exc) {
            try {
                storage.delete(key);
            } catch (RuntimeException cleanupExc) {
                exc.addSuppressed(cleanupExc);
            }
            throw exc;
        }
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> listTaskAttachments(Long taskId, String authorizationHeader) {
        targetAccess.requireAccess(AttachmentTargetType.TASK, taskId, authorizationHeader);
        return attachments.findByTargetTypeAndTargetIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        AttachmentTargetType.TASK,
                        taskId
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AttachmentResponse get(Long attachmentId, String authorizationHeader) {
        var attachment = findVisible(attachmentId, authorizationHeader);
        return toResponse(attachment);
    }

    @Transactional(readOnly = true)
    public DownloadLinkResponse createDownloadLink(Long attachmentId, String authorizationHeader) {
        var attachment = findVisible(attachmentId, authorizationHeader);
        var expiresAt = Instant.now().plus(properties.signedUrlTtlSeconds(), ChronoUnit.SECONDS);
        var signedUrl = storage.createReadUrl(attachment.getStoredBlobKey(), expiresAt);
        return new DownloadLinkResponse(signedUrl.url(), signedUrl.expiresAt());
    }

    @Transactional
    public void delete(Long userId, Long attachmentId, String authorizationHeader) {
        var attachment = findVisible(attachmentId, authorizationHeader);
        if (!attachment.getUploaderUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the uploader can delete this attachment");
        }
        storage.delete(attachment.getStoredBlobKey());
        attachment.setDeletedAt(Instant.now());
    }

    private Attachment findVisible(Long attachmentId, String authorizationHeader) {
        var attachment = attachments.findByIdAndDeletedAtIsNull(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        targetAccess.requireAccess(attachment.getTargetType(), attachment.getTargetId(), authorizationHeader);
        return attachment;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment file is required");
        }
        if (file.getSize() > properties.maxBytes()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment exceeds maximum size");
        }
        if (file.getOriginalFilename() == null || file.getOriginalFilename().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment filename is required");
        }
        var contentType = normalizedContentType(file);
        if (contentType.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment content type is required");
        }
        if (!allowedContentTypes.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment content type is not allowed");
        }
    }

    private String normalizedContentType(MultipartFile file) {
        return file.getContentType() == null ? "" : file.getContentType().trim().toLowerCase(Locale.ROOT);
    }

    private AttachmentResponse toResponse(Attachment attachment) {
        return new AttachmentResponse(
                attachment.getId(),
                attachment.getTargetType(),
                attachment.getTargetId(),
                attachment.getOriginalFilename(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getUploaderUserId(),
                attachment.getCreatedAt()
        );
    }
}
