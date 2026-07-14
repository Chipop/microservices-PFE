CREATE TABLE email_deliveries (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(180) NOT NULL UNIQUE,
    source_event_id VARCHAR(64),
    source_event_type VARCHAR(96) NOT NULL,
    producer VARCHAR(96),
    recipient_email VARCHAR(254),
    subject VARCHAR(200),
    template_key VARCHAR(80) NOT NULL,
    status VARCHAR(32) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_deliveries_status_created
    ON email_deliveries(status, created_at DESC);
CREATE INDEX idx_email_deliveries_recipient_created
    ON email_deliveries(recipient_email, created_at DESC);
CREATE INDEX idx_email_deliveries_event_type_created
    ON email_deliveries(source_event_type, created_at DESC);
