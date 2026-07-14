package com.flowforge.email.template;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Locale;
import java.util.Map;

@Component
public class HtmlEmailRenderer {
    private final TemplateEngine emailTemplateEngine;

    public HtmlEmailRenderer(@Qualifier("emailTemplateEngine") TemplateEngine emailTemplateEngine) {
        this.emailTemplateEngine = emailTemplateEngine;
    }

    public String renderHtmlTemplate(String templateName, Map<String, Object> variables) {
        Context context = new Context(Locale.ENGLISH);
        context.setVariables(variables);
        return emailTemplateEngine.process(templateName, context);
    }

    public String generatePlainText(String htmlContent, String recipient) {
        // Simple fallback: use recipient email as prefix, then generic message
        return "You have received an email from FlowForge.\n" +
                "Please open this email in an HTML-capable client to view the full message.\n\n" +
                "Recipient: " + recipient;
    }
}
