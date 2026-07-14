package com.flowforge.email.template;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public enum EmailTemplateMetadata {
    USER_REGISTERED("user.registered", "welcome", List.of("user_name", "app_url", "current_year", "logo_url")),
    WEEKLY_SUMMARY("task.weekly_summary", "task-reminder", List.of("completed_count", "pending_count", "app_url", "current_year", "logo_url"));

    private final String eventType;
    private final String templateName;
    private final List<String> requiredVariables;

    EmailTemplateMetadata(String eventType, String templateName, List<String> requiredVariables) {
        this.eventType = eventType;
        this.templateName = templateName;
        this.requiredVariables = requiredVariables;
    }

    public String getEventType() {
        return eventType;
    }

    public String getTemplateName() {
        return templateName;
    }

    public List<String> getRequiredVariables() {
        return requiredVariables;
    }

    public static Optional<EmailTemplateMetadata> fromEventType(String eventType) {
        return Arrays.stream(values())
                .filter(t -> t.eventType.equals(eventType))
                .findFirst();
    }
}
