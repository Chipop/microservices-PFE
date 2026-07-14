package com.flowforge.email.template;

public record RenderedEmail(
        String templateKey,
        String recipient,
        String subject,
        String body,
        String htmlBody,
        boolean isHtml,
        String failureReason
) {
    public boolean shouldSend() {
        return recipient != null && !recipient.isBlank() && failureReason == null;
    }

    public static RenderedEmail failed(String templateKey, String reason) {
        return new RenderedEmail(templateKey, null, null, null, null, false, reason);
    }

    // Convenience constructors
    public static RenderedEmail plainText(String templateKey, String recipient, String subject, String body) {
        return new RenderedEmail(templateKey, recipient, subject, body, null, false, null);
    }

    public static RenderedEmail html(String templateKey, String recipient, String subject, String body, String htmlBody) {
        return new RenderedEmail(templateKey, recipient, subject, body, htmlBody, true, null);
    }
}

