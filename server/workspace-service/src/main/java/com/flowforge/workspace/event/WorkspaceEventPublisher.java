package com.flowforge.workspace.event;

public interface WorkspaceEventPublisher {
    void publish(String eventName, Long workspaceId, Long actorUserId);
}
