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
            case "password_reset.requested" -> passwordResetRequested(data);
            case "workspace.invitation" -> workspaceInvitation(data);
            case "task.assigned" -> taskAssigned(data);
            case "task.deadline_approaching" -> taskDeadlineApproaching(data);
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

    private RenderedEmail passwordResetRequested(Map<String, Object> data) {
        var email = firstString(data, "email", "recipientEmail");
        var resetUrl = firstString(data, "resetUrl", "resetLink", "passwordResetUrl");
        var token = firstString(data, "token", "resetToken");
        var failure = missingRecipient(email);
        if (failure == null && resetUrl == null && token == null) {
            failure = "Missing password reset link or token in event payload";
        }
        var body = "We received a password reset request for your FlowForge account.\n\n"
                + actionLine(resetUrl, token, "Open FlowForge and use your password reset token.")
                + "\n\nIf you did not request this, you can ignore this email.";
        return new RenderedEmail(
                "password-reset-requested",
                email,
                "Reset your FlowForge password",
                body,
                failure
        );
    }

    private RenderedEmail workspaceInvitation(Map<String, Object> data) {
        var email = firstString(data, "invitedEmail", "email", "recipientEmail");
        var workspaceName = firstString(data, "workspaceName", "name");
        var role = firstString(data, "role");
        var invitationUrl = firstString(data, "invitationUrl", "inviteUrl", "invitationLink");
        var token = firstString(data, "token", "invitationToken");
        var failure = missingRecipient(email);
        if (failure == null && invitationUrl == null && token == null) {
            failure = "Missing workspace invitation link or token in event payload";
        }
        var workspace = workspaceName == null ? "a FlowForge workspace" : workspaceName;
        var roleText = role == null ? "" : " as " + role;
        var body = "You have been invited to join " + workspace + roleText + ".\n\n"
                + actionLine(invitationUrl, token, "Open FlowForge to review your invitation.");
        return new RenderedEmail(
                "workspace-invitation",
                email,
                "Workspace invitation",
                body,
                failure
        );
    }

    private RenderedEmail taskAssigned(Map<String, Object> data) {
        var email = firstString(data, "assigneeEmail", "recipientEmail", "email");
        var title = firstString(data, "title", "taskTitle");
        var taskLabel = title == null ? "a task" : "\"" + title + "\"";
        var body = "You have been assigned " + taskLabel + " in FlowForge.\n\n"
                + optionalLine("Workspace ID", data.get("workspaceId"))
                + optionalLine("Task ID", data.get("taskId"));
        return new RenderedEmail(
                "task-assigned",
                email,
                "New task assignment",
                body.strip(),
                missingRecipient(email)
        );
    }

    private RenderedEmail taskDeadlineApproaching(Map<String, Object> data) {
        var email = firstString(data, "recipientEmail", "assigneeEmail", "email");
        var title = firstString(data, "title", "taskTitle");
        var dueAt = firstString(data, "dueAt", "due_at", "deadline");
        var taskLabel = title == null ? "A task" : "\"" + title + "\"";
        var body = taskLabel + " is approaching its deadline."
                + (dueAt == null ? "" : "\n\nDue at: " + dueAt)
                + "\n\nOpen FlowForge to review it.";
        return new RenderedEmail(
                "task-deadline-approaching",
                email,
                "Task deadline approaching",
                body,
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

    private String actionLine(String url, String token, String fallback) {
        if (url != null && !url.isBlank()) {
            return "Use this link: " + url;
        }
        if (token != null && !token.isBlank()) {
            return "Use this token: " + token;
        }
        return fallback;
    }

    private String optionalLine(String label, Object value) {
        return value == null ? "" : label + ": " + value + "\n";
    }
}
