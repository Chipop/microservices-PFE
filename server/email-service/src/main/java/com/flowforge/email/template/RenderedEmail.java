package com.flowforge.email.template;

public record RenderedEmail(
        String templateKey,
        String recipient,
        String subject,
        String body,
        String failureReason
) {
    public boolean shouldSend() {
        return recipient != null && !recipient.isBlank() && failureReason == null;
    }

    public static RenderedEmail failed(String templateKey, String reason) {
        return new RenderedEmail(templateKey, null, null, null, reason);
    }
}
