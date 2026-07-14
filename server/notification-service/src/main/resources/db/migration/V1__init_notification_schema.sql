CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    related_resource_id BIGINT,
    related_resource_type VARCHAR(64),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_recipient_visible_created
    ON notifications(recipient_user_id, deleted_at, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread
    ON notifications(recipient_user_id, is_read, deleted_at);
CREATE INDEX idx_notifications_type_created
    ON notifications(type, created_at DESC);
