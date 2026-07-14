package com.flowforge.attachment.service;

import com.flowforge.attachment.config.AttachmentProperties;
import com.flowforge.attachment.model.AttachmentTargetType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TargetAccessService {
    private final RestClient taskClient;

    public TargetAccessService(RestClient.Builder builder, AttachmentProperties properties) {
        this.taskClient = builder.baseUrl(properties.taskServiceBaseUrl()).build();
    }

    public TargetPermission requireView(AttachmentTargetType targetType, Long targetId, String authorizationHeader) {
        var permission = permission(targetType, targetId, authorizationHeader);
        if (!permission.hasView()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment target not found");
        }
        return permission;
    }

    public TargetPermission requireContribute(AttachmentTargetType targetType, Long targetId, String authorizationHeader) {
        var permission = requireView(targetType, targetId, authorizationHeader);
        if (!permission.hasContribute()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Attachment contribution permission required");
        }
        return permission;
    }

    public TargetPermission requireDelete(AttachmentTargetType targetType, Long targetId, String authorizationHeader) {
        var permission = requireView(targetType, targetId, authorizationHeader);
        if (!permission.hasDelete()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the original uploader or workspace admin can delete this attachment");
        }
        return permission;
    }

    public TargetPermission requireAdmin(AttachmentTargetType targetType, Long targetId, String authorizationHeader) {
        var permission = requireView(targetType, targetId, authorizationHeader);
        if (!permission.hasAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Workspace admin role required");
        }
        return permission;
    }

    private TargetPermission permission(AttachmentTargetType targetType, Long targetId, String authorizationHeader) {
        if (targetType == AttachmentTargetType.COMMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use comment permission endpoint with task id");
        }
        if (targetType != AttachmentTargetType.TASK) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported attachment target type");
        }

        try {
            return taskClient.get()
                    .uri("/api/tasks/{taskId}/permissions", targetId)
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                    .retrieve()
                    .body(TargetPermission.class);
        } catch (HttpClientErrorException.NotFound exc) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        } catch (HttpClientErrorException.Unauthorized exc) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        } catch (HttpClientErrorException.Forbidden exc) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Task access denied");
        } catch (HttpClientErrorException.BadRequest exc) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid task id");
        } catch (HttpClientErrorException exc) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Task permission check failed");
        } catch (RestClientException exc) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Task service unavailable");
        }
    }

    public TargetPermission requireCommentView(Long taskId, Long commentId, String authorizationHeader) {
        var permission = commentPermission(taskId, commentId, authorizationHeader);
        if (!permission.hasView()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        return permission;
    }

    public TargetPermission requireCommentContribute(Long taskId, Long commentId, String authorizationHeader) {
        var permission = requireCommentView(taskId, commentId, authorizationHeader);
        if (!permission.hasContribute()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Attachment contribution permission required");
        }
        return permission;
    }

    public TargetPermission requireCommentDelete(Long taskId, Long commentId, String authorizationHeader) {
        var permission = requireCommentView(taskId, commentId, authorizationHeader);
        if (!permission.hasDelete()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the original uploader or workspace admin can delete this attachment");
        }
        return permission;
    }

    public TargetPermission requireCommentAdmin(Long taskId, Long commentId, String authorizationHeader) {
        var permission = requireCommentView(taskId, commentId, authorizationHeader);
        if (!permission.hasAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Workspace admin role required");
        }
        return permission;
    }

    private TargetPermission commentPermission(Long taskId, Long commentId, String authorizationHeader) {
        try {
            return taskClient.get()
                    .uri("/api/tasks/{taskId}/comments/{commentId}/permissions", taskId, commentId)
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                    .retrieve()
                    .body(TargetPermission.class);
        } catch (HttpClientErrorException.NotFound exc) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        } catch (HttpClientErrorException.Unauthorized exc) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        } catch (HttpClientErrorException.Forbidden exc) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Comment access denied");
        } catch (HttpClientErrorException.BadRequest exc) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid comment target");
        } catch (HttpClientErrorException exc) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Comment permission check failed");
        } catch (RestClientException exc) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Task service unavailable");
        }
    }

    public record TargetPermission(
            Long taskId,
            Long commentId,
            Long workspace_id,
            Long author_user_id,
            Boolean canView,
            Boolean canContribute,
            Boolean canAdmin,
            Boolean canDelete
    ) {
        public boolean hasView() {
            return Boolean.TRUE.equals(canView);
        }

        public boolean hasContribute() {
            return Boolean.TRUE.equals(canContribute);
        }

        public boolean hasAdmin() {
            return Boolean.TRUE.equals(canAdmin);
        }

        public boolean hasDelete() {
            return Boolean.TRUE.equals(canDelete);
        }
    }
}
