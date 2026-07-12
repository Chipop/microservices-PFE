package com.flowforge.attachment.service;

import com.flowforge.attachment.config.AttachmentProperties;
import com.flowforge.attachment.dto.AttachmentResponse;
import com.flowforge.attachment.dto.DownloadLinkResponse;
import com.flowforge.attachment.event.DomainEventPublisher;
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
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AttachmentService {
    private final AttachmentRepository attachments;
    private final AttachmentStorage storage;
    private final TargetAccessService targetAccess;
    private final AttachmentProperties properties;
    private final DomainEventPublisher events;
    private final Set<String> allowedContentTypes;

    public AttachmentService(
            AttachmentRepository attachments,
            AttachmentStorage storage,
            TargetAccessService targetAccess,
            AttachmentProperties properties,
            DomainEventPublisher events
    ) {
        this.attachments = attachments;
        this.storage = storage;
        this.targetAccess = targetAccess;
        this.properties = properties;
        this.events = events;
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
        targetAccess.requireContribute(AttachmentTargetType.TASK, taskId, authorizationHeader);
        return upload(userId, AttachmentTargetType.TASK, taskId, taskId, file);
    }

    @Transactional
    public AttachmentResponse uploadCommentAttachment(
            Long userId,
            Long taskId,
            Long commentId,
            MultipartFile file,
            String authorizationHeader
    ) {
        targetAccess.requireCommentContribute(taskId, commentId, authorizationHeader);
        return upload(userId, AttachmentTargetType.COMMENT, commentId, taskId, file);
    }

    private AttachmentResponse upload(
            Long userId,
            AttachmentTargetType targetType,
            Long targetId,
            Long parentTaskId,
            MultipartFile file
    ) {
        validateFile(file);

        var contentType = normalizedContentType(file);
        var originalFilename = file.getOriginalFilename().trim();
        var key = storage.buildKey(userId, originalFilename);
        try {
            storage.upload(key, file, contentType);
            var attachment = new Attachment();
            attachment.setUploaderUserId(userId);
            attachment.setTargetType(targetType);
            attachment.setTargetId(targetId);
            attachment.setParentTaskId(parentTaskId);
            attachment.setOriginalFilename(originalFilename);
            attachment.setStoredBlobKey(key);
            attachment.setContentType(contentType);
            attachment.setSizeBytes(file.getSize());
            var saved = attachments.save(attachment);
            events.publish("attachment.added", "attachment", saved.getId(), userId, Map.of(
                    "attachmentId", saved.getId(),
                    "targetType", saved.getTargetType().name(),
                    "targetId", saved.getTargetId(),
                    "parentTaskId", saved.getParentTaskId(),
                    "filename", saved.getOriginalFilename(),
                    "contentType", saved.getContentType(),
                    "sizeBytes", saved.getSizeBytes()
            ));
            return toResponse(saved);
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
        targetAccess.requireView(AttachmentTargetType.TASK, taskId, authorizationHeader);
        return attachments.findByTargetTypeAndTargetIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        AttachmentTargetType.TASK,
                        taskId
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> listCommentAttachments(Long taskId, Long commentId, String authorizationHeader) {
        targetAccess.requireCommentView(taskId, commentId, authorizationHeader);
        return attachments.findByTargetTypeAndTargetIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        AttachmentTargetType.COMMENT,
                        commentId
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
            if (attachment.getTargetType() == AttachmentTargetType.TASK) {
                targetAccess.requireAdmin(AttachmentTargetType.TASK, attachment.getTargetId(), authorizationHeader);
            } else {
                targetAccess.requireCommentAdmin(attachment.getParentTaskId(), attachment.getTargetId(), authorizationHeader);
            }
        }
        attachment.setDeletedAt(Instant.now());
        attachment.setDeletedByUserId(userId);
    }

    private Attachment findVisible(Long attachmentId, String authorizationHeader) {
        var attachment = attachments.findByIdAndDeletedAtIsNull(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        if (attachment.getTargetType() == AttachmentTargetType.TASK) {
            targetAccess.requireView(AttachmentTargetType.TASK, attachment.getTargetId(), authorizationHeader);
        } else {
            targetAccess.requireCommentView(attachment.getParentTaskId(), attachment.getTargetId(), authorizationHeader);
        }
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
                attachment.getParentTaskId(),
                attachment.getOriginalFilename(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getUploaderUserId(),
                attachment.getCreatedAt()
        );
    }
}
