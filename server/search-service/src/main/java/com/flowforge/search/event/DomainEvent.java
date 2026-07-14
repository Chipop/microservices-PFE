package com.flowforge.search.event;

import java.util.Map;

public record DomainEvent(
        String eventId,
        String eventType,
        String occurredAt,
        String producer,
        Long actorUserId,
        Resource resource,
        Map<String, Object> data
) {
    public record Resource(String type, Long id) {
    }
}
