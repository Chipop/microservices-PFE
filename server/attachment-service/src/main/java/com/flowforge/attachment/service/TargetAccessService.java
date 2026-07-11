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

    public void requireAccess(AttachmentTargetType targetType, Long targetId, String authorizationHeader) {
        if (targetType == AttachmentTargetType.COMMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment attachments are not supported yet");
        }
        if (targetType != AttachmentTargetType.TASK) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported attachment target type");
        }

        try {
            taskClient.get()
                    .uri("/api/tasks/{taskId}", targetId)
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                    .retrieve()
                    .toBodilessEntity();
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
}
