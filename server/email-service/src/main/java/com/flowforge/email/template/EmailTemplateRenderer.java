package com.flowforge.email.template;

import com.flowforge.email.config.EmailProperties;
import com.flowforge.email.event.DomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class EmailTemplateRenderer {
    private static final Logger logger = LoggerFactory.getLogger(EmailTemplateRenderer.class);

    private final HtmlEmailRenderer htmlRenderer;
    private final TemplateVariableBuilder variableBuilder;
    private final EmailProperties emailProperties;

    public EmailTemplateRenderer(
            HtmlEmailRenderer htmlRenderer,
            TemplateVariableBuilder variableBuilder,
            EmailProperties emailProperties
    ) {
        this.htmlRenderer = htmlRenderer;
        this.variableBuilder = variableBuilder;
        this.emailProperties = emailProperties;
    }

    public RenderedEmail render(DomainEvent event) {
        var templateMetadata = EmailTemplateMetadata.fromEventType(event.eventType());
        
        if (templateMetadata.isEmpty()) {
            return RenderedEmail.failed(event.eventType(), "Unsupported event type: " + event.eventType());
        }

        var metadata = templateMetadata.get();
        
        if (!emailProperties.enableHtmlEmails()) {
            logger.debug("HTML emails disabled, returning plain text fallback for {}", event.eventType());
            return renderPlainText(event, metadata);
        }

        return renderHtml(event, metadata);
    }

    private RenderedEmail renderHtml(DomainEvent event, EmailTemplateMetadata metadata) {
        try {
            var context = variableBuilder.buildContext(event);
            variableBuilder.validateRequiredVariables(context, metadata.getRequiredVariables());

            String htmlBody = htmlRenderer.renderHtmlTemplate(metadata.getTemplateName(), context);
            String plainText = htmlRenderer.generatePlainText(htmlBody, extractRecipient(context));
            
            String subject = buildSubject(metadata.getEventType(), context);
            String recipient = extractRecipient(context);

            logger.debug("Rendered HTML email template: {}", metadata.getTemplateName());
            return RenderedEmail.html(
                    metadata.getTemplateName(),
                    recipient,
                    subject,
                    plainText,
                    htmlBody
            );
        } catch (TemplateVariableBuilder.MissingTemplateVariableException e) {
            logger.error("Failed to render HTML template {}: {}", metadata.getTemplateName(), e.getMessage());
            return RenderedEmail.failed(metadata.getTemplateName(), e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to render HTML template {}: {}", metadata.getTemplateName(), e.getMessage(), e);
            return RenderedEmail.failed(metadata.getTemplateName(), "Template rendering failed: " + e.getMessage());
        }
    }

    private RenderedEmail renderPlainText(DomainEvent event, EmailTemplateMetadata metadata) {
        var data = event.data() == null ? Map.<String, Object>of() : event.data();
        return switch (metadata.getEventType()) {
            case "user.registered" -> userRegistered(data);
            case "task.weekly_summary" -> weeklyTaskSummary(data);
            default -> RenderedEmail.failed(event.eventType(), "Unsupported event type: " + event.eventType());
        };
    }

    private RenderedEmail userRegistered(Map<String, Object> data) {
        var email = firstString(data, "email", "recipientEmail");
        var username = firstString(data, "username", "name");
        var name = username == null ? "there" : username;
        var failureReason = missingRecipient(email);
        
        if (failureReason != null) {
            return RenderedEmail.failed("user-registered", failureReason);
        }
        
        return RenderedEmail.plainText(
                "user-registered",
                email,
                "Welcome to FlowForge",
                "Hi " + name + ",\n\nYour FlowForge account is ready.\n\nThe FlowForge team"
        );
    }

    private RenderedEmail weeklyTaskSummary(Map<String, Object> data) {
        var email = firstString(data, "recipientEmail", "email");
        var completed = firstString(data, "completedCount", "completed");
        var pending = firstString(data, "pendingCount", "pending");
        var failureReason = missingRecipient(email);
        
        if (failureReason != null) {
            return RenderedEmail.failed("weekly-task-summary", failureReason);
        }
        
        var body = "Here is your weekly FlowForge task summary.\n\n"
                + "Completed tasks: " + (completed == null ? "0" : completed) + "\n"
                + "Pending tasks: " + (pending == null ? "0" : pending) + "\n\n"
                + "Open FlowForge for the full view.";
        
        return RenderedEmail.plainText(
                "weekly-task-summary",
                email,
                "Your weekly task summary",
                body
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

    private String extractRecipient(Map<String, Object> context) {
        var email = context.get("email");
        if (email != null) return String.valueOf(email);
        var recipientEmail = context.get("recipientEmail");
        if (recipientEmail != null) return String.valueOf(recipientEmail);
        return null;
    }

    private String buildSubject(String eventType, Map<String, Object> context) {
        return switch (eventType) {
            case "user.registered" -> "Welcome to FlowForge";
            case "task.weekly_summary" -> "Your weekly task summary";
            default -> "Notification from FlowForge";
        };
    }
}
