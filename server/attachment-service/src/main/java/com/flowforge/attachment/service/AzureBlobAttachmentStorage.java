package com.flowforge.attachment.service;

import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.common.StorageSharedKeyCredential;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.BlobStorageException;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import com.flowforge.attachment.config.AttachmentProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

@Service
public class AzureBlobAttachmentStorage implements AttachmentStorage {
    private final BlobServiceClient client;
    private final String container;
    private final String keyPrefix;
    private final boolean accountKeyConfigured;

    public AzureBlobAttachmentStorage(AttachmentProperties properties) {
        var storage = properties.storage();
        this.container = requireText(storage.azureContainer(), "Azure storage container is required");
        this.keyPrefix = cleanPrefix(storage.keyPrefix());

        if (hasText(storage.connectionString())) {
            this.client = new BlobServiceClientBuilder()
                    .connectionString(storage.connectionString())
                    .buildClient();
            this.accountKeyConfigured = storage.connectionString().contains("AccountKey=");
        } else if (hasText(storage.accountUrl())) {
            if (hasText(storage.accountKey())) {
                this.client = new BlobServiceClientBuilder()
                        .endpoint(storage.accountUrl())
                        .credential(new StorageSharedKeyCredential(
                                accountName(storage),
                                storage.accountKey()
                        ))
                        .buildClient();
                this.accountKeyConfigured = true;
            } else {
                this.client = new BlobServiceClientBuilder()
                        .endpoint(storage.accountUrl())
                        .credential(new DefaultAzureCredentialBuilder().build())
                        .buildClient();
                this.accountKeyConfigured = false;
            }
        } else {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Azure storage requires AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_URL"
            );
        }
    }

    @Override
    public String buildKey(Long uploaderUserId, String originalFilename) {
        var safeName = safeFilename(originalFilename);
        return "%s/%d/%s/%s".formatted(keyPrefix, uploaderUserId, UUID.randomUUID(), safeName);
    }

    @Override
    public String upload(String key, MultipartFile file, String contentType) throws IOException {
        var blob = blob(key);
        try (var input = file.getInputStream()) {
            blob.upload(input, file.getSize(), true);
        }
        blob.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType));
        return key;
    }

    @Override
    public void delete(String key) {
        try {
            blob(key).delete();
        } catch (BlobStorageException exc) {
            if (exc.getStatusCode() != 404) {
                throw exc;
            }
        }
    }

    @Override
    public SignedUrl createReadUrl(String key, Instant expiresAt) {
        var blob = blob(key);
        var expiry = OffsetDateTime.ofInstant(expiresAt, ZoneOffset.UTC);
        var start = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1);
        var permission = new BlobSasPermission().setReadPermission(true);
        var values = new BlobServiceSasSignatureValues(expiry, permission)
                .setStartTime(start);

        String sas;
        if (accountKeyConfigured) {
            sas = blob.generateSas(values);
        } else {
            var delegationKey = client.getUserDelegationKey(start, expiry);
            sas = blob.generateUserDelegationSas(values, delegationKey);
        }
        return new SignedUrl(blob.getBlobUrl() + "?" + sas, expiresAt);
    }

    private BlobClient blob(String key) {
        return client.getBlobContainerClient(container).getBlobClient(key);
    }

    private static String cleanPrefix(String value) {
        var prefix = hasText(value) ? value.trim() : "attachments";
        while (prefix.startsWith("/")) {
            prefix = prefix.substring(1);
        }
        while (prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        return prefix.isBlank() ? "attachments" : prefix;
    }

    private static String safeFilename(String filename) {
        var base = Paths.get(filename == null ? "" : filename).getFileName();
        var value = base == null ? "" : base.toString().trim();
        if (value.isBlank()) {
            return "attachment";
        }
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "-")
                .replaceAll("-+", "-");
    }

    private static String requireText(String value, String message) {
        if (!hasText(value)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, message);
        }
        return value.trim();
    }

    private static String accountName(AttachmentProperties.Storage storage) {
        if (hasText(storage.accountName())) {
            return storage.accountName().trim();
        }
        try {
            var host = new URI(storage.accountUrl()).getHost();
            if (host != null && host.contains(".")) {
                return host.substring(0, host.indexOf('.'));
            }
        } catch (URISyntaxException exc) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid AZURE_STORAGE_ACCOUNT_URL");
        }
        throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "AZURE_STORAGE_ACCOUNT_NAME is required when it cannot be inferred from AZURE_STORAGE_ACCOUNT_URL"
        );
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
