package com.flowforge.email.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "email")
public record EmailProperties(
        String from,
        int maxAttempts,
        long retryBackoffMs
) {
}
