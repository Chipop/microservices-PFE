CREATE TABLE attachments (
    id BIGSERIAL PRIMARY KEY,
    uploader_user_id BIGINT NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_blob_key VARCHAR(1024) NOT NULL UNIQUE,
    content_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_attachments_target ON attachments(target_type, target_id, created_at);
CREATE INDEX idx_attachments_uploader_user_id ON attachments(uploader_user_id, created_at);
CREATE INDEX idx_attachments_deleted_at ON attachments(deleted_at);
