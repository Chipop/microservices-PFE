package com.flowforge.attachment.controller;

import com.flowforge.attachment.dto.AttachmentResponse;
import com.flowforge.attachment.dto.DownloadLinkResponse;
import com.flowforge.attachment.service.AttachmentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {
    private final AttachmentService service;

    public AttachmentController(AttachmentService service) {
        this.service = service;
    }

    @PostMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentResponse uploadTaskAttachment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long taskId,
            @RequestPart("file") MultipartFile file,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader
    ) {
        return service.uploadTaskAttachment(userId(jwt), taskId, file, authorizationHeader);
    }

    @GetMapping("/tasks/{taskId}")
    public List<AttachmentResponse> listTaskAttachments(
            @PathVariable Long taskId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader
    ) {
        return service.listTaskAttachments(taskId, authorizationHeader);
    }

    @PostMapping("/tasks/{taskId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentResponse uploadCommentAttachment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long taskId,
            @PathVariable Long commentId,
            @RequestPart("file") MultipartFile file,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader
    ) {
        return service.uploadCommentAttachment(userId(jwt), taskId, commentId, file, authorizationHeader);
    }

    @GetMapping("/tasks/{taskId}/comments/{commentId}")
    public List<AttachmentResponse> listCommentAttachments(
            @PathVariable Long taskId,
            @PathVariable Long commentId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader
    ) {
        return service.listCommentAttachments(taskId, commentId, authorizationHeader);
    }

    @GetMapping("/{attachmentId}")
    public AttachmentResponse get(
            @PathVariable Long attachmentId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader
    ) {
        return service.get(attachmentId, authorizationHeader);
    }

    @PostMapping("/{attachmentId}/download-link")
    public DownloadLinkResponse createDownloadLink(
            @PathVariable Long attachmentId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader
    ) {
        return service.createDownloadLink(attachmentId, authorizationHeader);
    }

    @DeleteMapping("/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long attachmentId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader
    ) {
        service.delete(userId(jwt), attachmentId, authorizationHeader);
    }

    private Long userId(Jwt jwt) {
        Object raw = jwt.getClaim("user_id");
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token has no user_id claim");
        }
        try {
            return Long.valueOf(raw.toString());
        } catch (NumberFormatException exc) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token has invalid user_id claim");
        }
    }
}
