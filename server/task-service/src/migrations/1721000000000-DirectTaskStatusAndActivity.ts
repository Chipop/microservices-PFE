import { MigrationInterface, QueryRunner } from 'typeorm';

export class DirectTaskStatusAndActivity1721000000000 implements MigrationInterface {
  name = 'DirectTaskStatusAndActivity1721000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tasks_status_enum') THEN
          CREATE TYPE tasks_status_enum AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done', 'archived');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS status tasks_status_enum NOT NULL DEFAULT 'todo'
    `);
    await queryRunner.query(`
      UPDATE tasks
      SET status = task_statuses.slug::tasks_status_enum
      FROM task_statuses
      WHERE tasks.status_id = task_statuses.id
        AND task_statuses.slug IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'archived')
    `);
    await queryRunner.query(`
      UPDATE tasks
      SET completed_at = NULL
      WHERE status <> 'done'
    `);
    await queryRunner.query(`
      UPDATE tasks
      SET completed_at = COALESCE(completed_at, NOW())
      WHERE status = 'done'
    `);
    await queryRunner.query(`
      UPDATE tasks
      SET archived_at = COALESCE(archived_at, NOW())
      WHERE status = 'archived'
    `);
    await queryRunner.query(`
      ALTER TABLE tasks
      DROP COLUMN IF EXISTS status_id
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS task_statuses
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_activities (
        id SERIAL PRIMARY KEY,
        task_id INT NOT NULL,
        actor_user_id INT NOT NULL,
        type VARCHAR(80) NOT NULL,
        from_value VARCHAR(200),
        to_value VARCHAR(200),
        message VARCHAR(500) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_task_activities_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_task_activities_actor_user_id ON task_activities(actor_user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS task_activities`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_statuses (
        id SERIAL PRIMARY KEY,
        owner_user_id INT NOT NULL,
        name VARCHAR(80) NOT NULL,
        slug VARCHAR(80) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        is_terminal BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT uq_task_status_owner_slug UNIQUE (owner_user_id, slug)
      )
    `);
    await queryRunner.query(`
      INSERT INTO task_statuses (owner_user_id, name, slug, position, is_terminal)
      SELECT DISTINCT owner_user_id, 'Todo', 'todo', 1, false
      FROM tasks
      ON CONFLICT (owner_user_id, slug) DO NOTHING
    `);
    await queryRunner.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_id INT
    `);
    await queryRunner.query(`
      UPDATE tasks
      SET status_id = task_statuses.id
      FROM task_statuses
      WHERE tasks.owner_user_id = task_statuses.owner_user_id
        AND task_statuses.slug = 'todo'
    `);
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN status_id SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS status
    `);
  }
}
