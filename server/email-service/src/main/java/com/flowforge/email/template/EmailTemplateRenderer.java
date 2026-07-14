package com.flowforge.email.template;

import com.flowforge.email.event.DomainEvent;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class EmailTemplateRenderer {
    public RenderedEmail render(DomainEvent event) {
        var data = event.data() == null ? Map.<String, Object>of() : event.data();
        return switch (event.eventType()) {
            case "user.registered" -> userRegistered(data);
            case "task.weekly_summary" -> weeklyTaskSummary(data);
            default -> RenderedEmail.failed(event.eventType(), "Unsupported event type: " + event.eventType());
        };
    }

    private RenderedEmail userRegistered(Map<String, Object> data) {
        var email = firstString(data, "email", "recipientEmail");
        var username = firstString(data, "username", "name");
        var name = username == null ? "there" : username;
        return new RenderedEmail(
                "user-registered",
                email,
                "Welcome to FlowForge",
                "Hi " + name + ",\n\nYour FlowForge account is ready.\n\nThe FlowForge team",
                missingRecipient(email)
        );
    }

    private RenderedEmail weeklyTaskSummary(Map<String, Object> data) {
        var email = firstString(data, "recipientEmail", "email");
        var completed = firstString(data, "completedCount", "completed");
        var pending = firstString(data, "pendingCount", "pending");
        var body = "Here is your weekly FlowForge task summary.\n\n"
                + "Completed tasks: " + (completed == null ? "0" : completed) + "\n"
                + "Pending tasks: " + (pending == null ? "0" : pending) + "\n\n"
                + "Open FlowForge for the full view.";
        return new RenderedEmail(
                "weekly-task-summary",
                email,
                "Your weekly task summary",
                body,
                missingRecipient(email)
        );
    }

    private String firstString(Map<String, Object> data, String... keys) {
        for (var key : keys) {
            var value = data.get(key);
            if (value != null && !String.valueOf(value).isBlank()) {
                return String.valueOf(value);
            }
        }
        return null;
    }

    private String missingRecipient(String email) {
        return email == null || email.isBlank() ? "Missing recipient email in event payload" : null;
    }

}
