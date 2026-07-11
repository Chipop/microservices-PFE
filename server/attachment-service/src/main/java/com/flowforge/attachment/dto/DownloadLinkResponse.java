package com.flowforge.attachment.dto;

import java.time.Instant;

public record DownloadLinkResponse(
        String url,
        Instant expiresAt
) {
}
