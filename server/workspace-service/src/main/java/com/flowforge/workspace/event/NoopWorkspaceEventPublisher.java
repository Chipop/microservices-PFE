package com.flowforge.workspace.event;

import org.springframework.stereotype.Component;

@Component
public class NoopWorkspaceEventPublisher implements WorkspaceEventPublisher {
    @Override
    public void publish(String eventName, Long workspaceId, Long actorUserId) {
        // Hook for a future Kafka/RabbitMQ publisher.
    }
}
