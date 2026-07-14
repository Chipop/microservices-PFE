import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  ARCHIVED = 'archived',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'kanban_columns' })
@Unique(['owner_user_id', 'name'])
export class KanbanColumn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  owner_user_id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => Task, (task) => task.kanban_column)
  tasks: Task[];
}

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  owner_user_id: number;

  @Column({ type: 'int', nullable: true })
  @Index()
  workspace_id: number | null;

  @Column({ type: 'int', nullable: true })
  @Index()
  project_id: number | null;

  @Column({ type: 'int', nullable: true })
  @Index()
  author_user_id: number | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  @Index()
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.NORMAL,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamptz', nullable: true })
  due_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  archived_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'int', nullable: true })
  deleted_by_user_id: number | null;

  @Column({ type: 'int', nullable: true })
  kanban_column_id: number | null;

  @ManyToOne(() => KanbanColumn, (column) => column.tasks, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'kanban_column_id' })
  kanban_column: KanbanColumn | null;

  @OneToMany(() => TaskAssignment, (assignment) => assignment.task, {
    cascade: ['insert', 'update'],
  })
  assignments: TaskAssignment[];

  @OneToMany(() => TaskTag, (tag) => tag.task, { cascade: ['insert', 'update'] })
  task_tags: TaskTag[];

  @OneToMany(() => Subtask, (subtask) => subtask.task, {
    cascade: ['insert', 'update'],
  })
  subtasks: Subtask[];

  @OneToMany(() => TaskDependency, (dependency) => dependency.task)
  dependencies: TaskDependency[];

  @OneToMany(() => TaskReminder, (reminder) => reminder.task)
  reminders: TaskReminder[];

  @OneToMany(() => TaskActivity, (activity) => activity.task)
  activities: TaskActivity[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

@Entity({ name: 'task_activities' })
export class TaskActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  task_id: number;

  @ManyToOne(() => Task, (task) => task.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'int' })
  @Index()
  actor_user_id: number;

  @Column({ type: 'varchar', length: 80 })
  type: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  from_value: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  to_value: string | null;

  @Column({ type: 'varchar', length: 500 })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity({ name: 'task_assignments' })
@Unique(['task_id', 'assignee_user_id'])
export class TaskAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  task_id: number;

  @ManyToOne(() => Task, (task) => task.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'int' })
  assignee_user_id: number;

  @Column({ type: 'int' })
  assigned_by_user_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity({ name: 'tags' })
@Unique(['owner_user_id', 'name'])
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  owner_user_id: number;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 32, default: '#1976d2' })
  color: string;
}

@Entity({ name: 'task_tags' })
@Unique(['task_id', 'tag_id'])
export class TaskTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  task_id: number;

  @ManyToOne(() => Task, (task) => task.task_tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'int' })
  tag_id: number;

  @ManyToOne(() => Tag, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}

@Entity({ name: 'subtasks' })
export class Subtask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  task_id: number;

  @ManyToOne(() => Task, (task) => task.subtasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'boolean', default: false })
  done: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

@Entity({ name: 'task_dependencies' })
@Unique(['task_id', 'depends_on_task_id'])
export class TaskDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  task_id: number;

  @ManyToOne(() => Task, (task) => task.dependencies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'int' })
  @Index()
  depends_on_task_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity({ name: 'task_recurrences' })
@Unique(['task_id'])
export class TaskRecurrence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  task_id: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  rule: Record<string, unknown>;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

@Entity({ name: 'task_reminders' })
export class TaskReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  task_id: number;

  @ManyToOne(() => Task, (task) => task.reminders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'timestamptz' })
  remind_at: Date;

  @Column({
    type: 'enum',
    enum: ReminderStatus,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity({ name: 'saved_filters' })
@Unique(['owner_user_id', 'name'])
export class SavedFilter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  owner_user_id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  criteria: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
