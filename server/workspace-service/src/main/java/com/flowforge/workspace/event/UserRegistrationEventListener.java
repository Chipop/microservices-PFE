package com.flowforge.workspace.event;

import com.flowforge.workspace.service.WorkspaceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class UserRegistrationEventListener {
    private static final Logger logger = LoggerFactory.getLogger(UserRegistrationEventListener.class);

    private final WorkspaceService workspaceService;

    public UserRegistrationEventListener(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @RabbitListener(queues = "${events.queue}")
    public void consume(@Payload DomainEvent event) {
        if (event == null || !"user.registered".equals(event.eventType())) {
            logger.debug("Ignoring workspace provisioning event {}", event == null ? null : event.eventType());
            return;
        }

        var data = event.data() == null ? Map.<String, Object>of() : event.data();
        var userId = resolveUserId(event, data);
        var username = resolveUsername(data);
        workspaceService.ensurePersonalWorkspace(userId, username);
    }

    private Long resolveUserId(DomainEvent event, Map<String, Object> data) {
        var raw = data.get("userId");
        if (raw == null) raw = data.get("authUserId");
        if (raw == null && event.resource() != null) raw = event.resource().id();
        if (raw instanceof Number number) return number.longValue();
        if (raw != null && !String.valueOf(raw).isBlank()) return Long.parseLong(String.valueOf(raw));
        throw new IllegalArgumentException("user.registered event is missing user id");
    }

    private String resolveUsername(Map<String, Object> data) {
        var raw = data.get("username");
        if (raw == null || String.valueOf(raw).isBlank()) {
            throw new IllegalArgumentException("user.registered event is missing username");
        }
        return String.valueOf(raw);
    }
}
