package com.flowforge.email.template;

import com.flowforge.email.config.EmailProperties;
import com.flowforge.email.event.DomainEvent;
import org.springframework.stereotype.Component;

import java.time.Year;
import java.util.HashMap;
import java.util.Map;

@Component
public class TemplateVariableBuilder {
    private final EmailProperties emailProperties;

    public TemplateVariableBuilder(EmailProperties emailProperties) {
        this.emailProperties = emailProperties;
    }

    public Map<String, Object> buildContext(DomainEvent event) {
        var context = new HashMap<String, Object>();
        
        // Add standard variables
        context.put("current_year", Year.now().getValue());
        context.put("app_url", emailProperties.appUrl());
        context.put("logo_url", emailProperties.logoUrl());
        
        // Add event-specific variables
        if (event.data() != null) {
            context.putAll(event.data());
        }
        
        return context;
    }

    public void validateRequiredVariables(Map<String, Object> context, java.util.List<String> requiredVariables) {
        for (String variable : requiredVariables) {
            if (!context.containsKey(variable) || context.get(variable) == null) {
                throw new MissingTemplateVariableException("Missing required template variable: " + variable);
            }
        }
    }

    public static class MissingTemplateVariableException extends RuntimeException {
        public MissingTemplateVariableException(String message) {
            super(message);
        }
    }
}
