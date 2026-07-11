package com.flowforge.workspace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "workspace")
public record WorkspaceProperties(
        String jwtSigningKey,
        long invitationTtlHours,
        String corsAllowedOrigins
) {
}
