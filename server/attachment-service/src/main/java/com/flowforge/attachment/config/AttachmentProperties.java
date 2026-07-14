package com.flowforge.attachment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "attachment")
public record AttachmentProperties(
        String jwtSigningKey,
        String corsAllowedOrigins,
        String taskServiceBaseUrl,
        long maxBytes,
        String allowedContentTypes,
        long signedUrlTtlSeconds,
        Storage storage
) {
    public record Storage(
            String azureContainer,
            String connectionString,
            String accountUrl,
            String accountName,
            String accountKey,
            String keyPrefix
    ) {
    }
}
