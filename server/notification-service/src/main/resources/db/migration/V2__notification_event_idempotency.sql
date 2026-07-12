ALTER TABLE notifications
    ADD COLUMN source_event_id VARCHAR(96);

CREATE UNIQUE INDEX uq_notifications_source_event_recipient_type
    ON notifications(source_event_id, recipient_user_id, type)
    WHERE source_event_id IS NOT NULL;

CREATE INDEX idx_notifications_source_event
    ON notifications(source_event_id)
    WHERE source_event_id IS NOT NULL;
