ALTER TABLE attachments
    ADD COLUMN IF NOT EXISTS deleted_by_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS parent_task_id BIGINT;

UPDATE attachments
SET parent_task_id = target_id
WHERE parent_task_id IS NULL AND target_type = 'TASK';

ALTER TABLE attachments
    ALTER COLUMN parent_task_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_parent_task_id ON attachments(parent_task_id);
