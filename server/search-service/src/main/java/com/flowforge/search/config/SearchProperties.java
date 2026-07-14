package com.flowforge.search.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "search")
public record SearchProperties(
        String jwtSigningKey,
        String internalApiKey,
        String corsAllowedOrigins,
        String elasticsearchUrl,
        String indexPrefix,
        Source source
) {
    public record Source(
            String taskServiceBaseUrl,
            String workspaceServiceBaseUrl,
            String projectServiceBaseUrl,
            String userServiceBaseUrl
    ) {
    }
}
