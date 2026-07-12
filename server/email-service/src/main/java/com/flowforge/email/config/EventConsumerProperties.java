package com.flowforge.email.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "events")
public record EventConsumerProperties(
        String exchange,
        String queue,
        List<String> routingKeys
) {
}
