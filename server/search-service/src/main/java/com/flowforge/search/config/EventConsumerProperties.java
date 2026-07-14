package com.flowforge.search.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "events")
public record EventConsumerProperties(
        String exchange,
        String queue,
        String deadLetterExchange,
        String deadLetterQueue,
        String deadLetterRoutingKey,
        int maxAttempts,
        long retryBackoffMs,
        List<String> routingKeys
) {
}
