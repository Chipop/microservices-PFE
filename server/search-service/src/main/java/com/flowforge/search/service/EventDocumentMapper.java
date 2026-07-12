package com.flowforge.search.service;

import com.flowforge.search.event.DomainEvent;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class EventDocumentMapper {
    public Map<String, Object> taskDocument(DomainEvent event) {
        var data = data(event);
        var document = base("task", longValue(data, "taskId", resourceId(event)));
        copy(document, data, "workspaceId", "ownerUserId", "authorUserId", "title", "description", "priority", "updatedAt");
        document.put("status", firstPresent(data, "status", "statusSlug"));
        document.put("tags", stringList(data.get("tags")));
        document.put("viewerUserIds", longList(firstPresent(data, "viewerUserIds", "memberUserIds")));
        return document;
    }

    public Map<String, Object> workspaceDocument(DomainEvent event) {
        var data = data(event);
        var document = base("workspace", longValue(data, "workspaceId", resourceId(event)));
        copy(document, data, "name", "description", "ownerUserId", "visibility", "workspaceType", "updatedAt");
        document.put("title", data.getOrDefault("name", ""));
        document.put("memberUserIds", longList(data.get("memberUserIds")));
        return document;
    }

    public Map<String, Object> userDocument(DomainEvent event) {
        var data = data(event);
        var document = base("user", longValue(data, "authUserId", resourceId(event)));
        copy(document, data, "authUserId", "username", "biography", "timezone", "language", "profilePictureUrl", "updatedAt");
        document.put("title", data.getOrDefault("username", ""));
        document.put("description", data.getOrDefault("biography", ""));
        return document;
    }

    public Map<String, Object> commentDocument(DomainEvent event) {
        var data = data(event);
        var document = base("comment", longValue(data, "commentId", resourceId(event)));
        copy(document, data, "commentId", "taskId", "workspaceId", "authorUserId", "body", "updatedAt");
        document.put("title", "Comment on task " + data.getOrDefault("taskId", ""));
        document.put("viewerUserIds", longList(firstPresent(data, "viewerUserIds", "memberUserIds")));
        return document;
    }

    private Map<String, Object> base(String type, Long id) {
        var document = new LinkedHashMap<String, Object>();
        document.put("type", type);
        document.put("resourceId", id);
        return document;
    }

    private Map<String, Object> data(DomainEvent event) {
        return event.data() == null ? Map.of() : event.data();
    }

    private Long resourceId(DomainEvent event) {
        return event.resource() == null ? null : event.resource().id();
    }

    private void copy(Map<String, Object> document, Map<String, Object> data, String... keys) {
        for (String key : keys) {
            if (data.containsKey(key)) {
                document.put(key, data.get(key));
            }
        }
    }

    private Object firstPresent(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            if (data.containsKey(key)) {
                return data.get(key);
            }
        }
        return null;
    }

    private Long longValue(Map<String, Object> data, String key, Long fallback) {
        Object raw = data.get(key);
        if (raw instanceof Number number) return number.longValue();
        if (raw instanceof String value && !value.isBlank()) return Long.parseLong(value);
        return fallback;
    }

    private List<Long> longList(Object raw) {
        var values = new ArrayList<Long>();
        if (raw instanceof Iterable<?> iterable) {
            for (Object item : iterable) {
                if (item instanceof Number number) values.add(number.longValue());
                if (item instanceof String value && !value.isBlank()) values.add(Long.parseLong(value));
            }
        }
        return values;
    }

    private List<String> stringList(Object raw) {
        var values = new ArrayList<String>();
        if (raw instanceof Iterable<?> iterable) {
            for (Object item : iterable) {
                if (item != null) values.add(String.valueOf(item));
            }
        }
        return values;
    }
}
