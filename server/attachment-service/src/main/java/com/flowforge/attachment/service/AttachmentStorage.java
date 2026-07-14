package com.flowforge.attachment.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;

public interface AttachmentStorage {
    String buildKey(Long uploaderUserId, String originalFilename);

    String upload(String key, MultipartFile file, String contentType) throws IOException;

    void delete(String key);

    SignedUrl createReadUrl(String key, Instant expiresAt);

    record SignedUrl(String url, Instant expiresAt) {
    }
}
