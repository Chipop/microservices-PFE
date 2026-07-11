package com.flowforge.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "notification")
public record NotificationProperties(
        String jwtSigningKey,
        String corsAllowedOrigins
) {
}
