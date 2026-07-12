package com.flowforge.workspace.event;

import java.util.Map;

public interface WorkspaceEventPublisher {
    void publish(String eventType, String resourceType, Long resourceId, Long actorUserId, Map<String, Object> data);
}
