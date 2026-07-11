import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import {
  AddDependencyDto,
  AddTagDto,
  AssignTaskDto,
  CreateKanbanColumnDto,
  CreateReminderDto,
  CreateSavedFilterDto,
  CreateStatusDto,
  CreateSubtaskDto,
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateKanbanColumnDto,
  UpdateSavedFilterDto,
  UpdateStatusDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
  UpsertRecurrenceDto,
} from './dto/task.dto';
import {
  KanbanColumn,
  SavedFilter,
  Subtask,
  Tag,
  Task,
  TaskAssignment,
  TaskDependency,
  TaskPriority,
  TaskRecurrence,
  TaskReminder,
  TaskStatus,
  TaskTag,
} from './entities/task.entity';

const DEFAULT_STATUSES = [
  { name: 'Todo', slug: 'todo', position: 0, is_terminal: false },
  { name: 'In Progress', slug: 'in_progress', position: 1, is_terminal: false },
  { name: 'Done', slug: 'done', position: 2, is_terminal: true },
  { name: 'Archived', slug: 'archived', position: 3, is_terminal: true },
] as const;

const DEFAULT_COLUMNS = [
  { name: 'Todo', position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Done', position: 2 },
] as const;

export interface TaskResponse {
  id: number;
  title: string;
  description: string;
  done: boolean;
  priority: TaskPriority;
  due_at: Date | null;
  completed_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
  status: { id: number; name: string; slug: string } | null;
  kanban_column: { id: number; name: string } | null;
  assignments: Array<{ id: number; assignee_user_id: number; assigned_by_user_id: number }>;
  tags: Array<{ id: number; name: string; color: string }>;
  subtasks: Array<{ id: number; title: string; done: boolean; position: number }>;
  dependencies: Array<{ id: number; depends_on_task_id: number }>;
  reminders: Array<{ id: number; remind_at: Date; status: string; sent_at: Date | null }>;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    @InjectRepository(TaskStatus)
    private readonly statuses: Repository<TaskStatus>,
    @InjectRepository(KanbanColumn)
    private readonly columns: Repository<KanbanColumn>,
    @InjectRepository(TaskAssignment)
    private readonly assignments: Repository<TaskAssignment>,
    @InjectRepository(Tag)
    private readonly tags: Repository<Tag>,
    @InjectRepository(TaskTag)
    private readonly taskTags: Repository<TaskTag>,
    @InjectRepository(Subtask)
    private readonly subtasks: Repository<Subtask>,
    @InjectRepository(TaskDependency)
    private readonly dependencies: Repository<TaskDependency>,
    @InjectRepository(TaskRecurrence)
    private readonly recurrences: Repository<TaskRecurrence>,
    @InjectRepository(TaskReminder)
    private readonly reminders: Repository<TaskReminder>,
    @InjectRepository(SavedFilter)
    private readonly savedFilters: Repository<SavedFilter>,
  ) {}

  async findAll(userId: number, query: ListTasksQueryDto): Promise<TaskResponse[]> {
    await this.ensureDefaults(userId);
    const where: FindOptionsWhere<Task> = { owner_user_id: userId };
    if (!query.include_archived) where.archived_at = IsNull();
    if (query.status_id) where.status_id = query.status_id;
    if (query.priority) where.priority = query.priority;

    const rows = await this.tasks.find({
      where,
      order: { created_at: 'DESC' },
      relations: this.taskRelations(),
    });
    return rows.map((task) => this.toResponse(task));
  }

  async create(userId: number, dto: CreateTaskDto): Promise<TaskResponse> {
    await this.ensureDefaults(userId);
    const status = dto.status_id
      ? await this.getOwnedStatus(userId, dto.status_id)
      : await this.getStatusBySlug(userId, dto.done ? 'done' : 'todo');
    const column = dto.kanban_column_id
      ? await this.getOwnedColumn(userId, dto.kanban_column_id)
      : null;

    const task = this.tasks.create({
      owner_user_id: userId,
      title: dto.title,
      description: dto.description ?? '',
      status_id: status.id,
      priority: dto.priority ?? TaskPriority.NORMAL,
      due_at: dto.due_at ? new Date(dto.due_at) : null,
      completed_at: dto.done ? new Date() : null,
      archived_at: status.slug === 'archived' ? new Date() : null,
      kanban_column_id: column?.id ?? null,
    });
    return this.findOne(userId, (await this.tasks.save(task)).id);
  }

  async findOne(userId: number, id: number): Promise<TaskResponse> {
    return this.toResponse(await this.getOwnedTask(userId, id));
  }

  async update(userId: number, id: number, dto: UpdateTaskDto): Promise<TaskResponse> {
    const task = await this.getOwnedTask(userId, id);

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.due_at !== undefined) task.due_at = dto.due_at ? new Date(dto.due_at) : null;
    if (dto.kanban_column_id !== undefined) {
      task.kanban_column_id = dto.kanban_column_id
        ? (await this.getOwnedColumn(userId, dto.kanban_column_id)).id
        : null;
    }
    if (dto.status_id !== undefined) {
      const status = await this.getOwnedStatus(userId, dto.status_id);
      task.status_id = status.id;
      if (status.slug === 'done' && !task.completed_at) task.completed_at = new Date();
      if (status.slug === 'archived' && !task.archived_at) task.archived_at = new Date();
    }
    if (dto.done !== undefined) {
      const status = await this.getStatusBySlug(userId, dto.done ? 'done' : 'todo');
      task.status_id = status.id;
      task.completed_at = dto.done ? (task.completed_at ?? new Date()) : null;
    }

    await this.tasks.save(task);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    const task = await this.getOwnedTask(userId, id);
    await this.tasks.remove(task);
  }

  async complete(userId: number, id: number): Promise<TaskResponse> {
    return this.update(userId, id, { done: true });
  }

  async archive(userId: number, id: number): Promise<TaskResponse> {
    const status = await this.getStatusBySlug(userId, 'archived');
    const task = await this.getOwnedTask(userId, id);
    task.status_id = status.id;
    task.archived_at = task.archived_at ?? new Date();
    await this.tasks.save(task);
    return this.findOne(userId, id);
  }

  async addAssignment(userId: number, taskId: number, dto: AssignTaskDto) {
    await this.getOwnedTask(userId, taskId);
    if (dto.assignee_user_id <= 0) throw new BadRequestException('Assignee must be a positive user id.');
    const row = this.assignments.create({
      task_id: taskId,
      assignee_user_id: dto.assignee_user_id,
      assigned_by_user_id: userId,
    });
    try {
      return await this.assignments.save(row);
    } catch {
      throw new ConflictException('Task is already assigned to this user.');
    }
  }

  async removeAssignment(userId: number, taskId: number, assigneeUserId: number): Promise<void> {
    await this.getOwnedTask(userId, taskId);
    const row = await this.assignments.findOne({
      where: { task_id: taskId, assignee_user_id: assigneeUserId },
    });
    if (!row) throw new NotFoundException('Assignment not found');
    await this.assignments.remove(row);
  }

  async addTag(userId: number, taskId: number, dto: AddTagDto) {
    await this.getOwnedTask(userId, taskId);
    const tag = dto.tag_id
      ? await this.getOwnedTag(userId, dto.tag_id)
      : await this.findOrCreateTag(userId, dto);
    const row = this.taskTags.create({ task_id: taskId, tag_id: tag.id });
    try {
      await this.taskTags.save(row);
    } catch {
      throw new ConflictException('Tag is already attached to this task.');
    }
    return this.findOne(userId, taskId);
  }

  async removeTag(userId: number, taskId: number, tagId: number): Promise<void> {
    await this.getOwnedTask(userId, taskId);
    const row = await this.taskTags.findOne({ where: { task_id: taskId, tag_id: tagId } });
    if (!row) throw new NotFoundException('Task tag not found');
    await this.taskTags.remove(row);
  }

  async createSubtask(userId: number, taskId: number, dto: CreateSubtaskDto) {
    await this.getOwnedTask(userId, taskId);
    const row = this.subtasks.create({
      task_id: taskId,
      title: dto.title,
      done: dto.done ?? false,
      position: dto.position ?? 0,
    });
    return this.subtasks.save(row);
  }

  async updateSubtask(userId: number, taskId: number, subtaskId: number, dto: UpdateSubtaskDto) {
    await this.getOwnedTask(userId, taskId);
    const row = await this.subtasks.findOne({ where: { id: subtaskId, task_id: taskId } });
    if (!row) throw new NotFoundException('Subtask not found');
    if (dto.title !== undefined) row.title = dto.title;
    if (dto.done !== undefined) row.done = dto.done;
    if (dto.position !== undefined) row.position = dto.position;
    return this.subtasks.save(row);
  }

  async removeSubtask(userId: number, taskId: number, subtaskId: number): Promise<void> {
    await this.getOwnedTask(userId, taskId);
    const row = await this.subtasks.findOne({ where: { id: subtaskId, task_id: taskId } });
    if (!row) throw new NotFoundException('Subtask not found');
    await this.subtasks.remove(row);
  }

  async addDependency(userId: number, taskId: number, dto: AddDependencyDto) {
    await this.getOwnedTask(userId, taskId);
    await this.getOwnedTask(userId, dto.depends_on_task_id);
    if (taskId === dto.depends_on_task_id) {
      throw new BadRequestException('A task cannot depend on itself.');
    }
    if (await this.wouldCreateDependencyCycle(taskId, dto.depends_on_task_id)) {
      throw new BadRequestException('Task dependency would create a cycle.');
    }
    const row = this.dependencies.create({
      task_id: taskId,
      depends_on_task_id: dto.depends_on_task_id,
    });
    try {
      return await this.dependencies.save(row);
    } catch {
      throw new ConflictException('Dependency already exists.');
    }
  }

  async removeDependency(userId: number, taskId: number, dependencyId: number): Promise<void> {
    await this.getOwnedTask(userId, taskId);
    const row = await this.dependencies.findOne({ where: { id: dependencyId, task_id: taskId } });
    if (!row) throw new NotFoundException('Dependency not found');
    await this.dependencies.remove(row);
  }

  async upsertRecurrence(userId: number, taskId: number, dto: UpsertRecurrenceDto) {
    await this.getOwnedTask(userId, taskId);
    let row = await this.recurrences.findOne({ where: { task_id: taskId } });
    row ??= this.recurrences.create({ task_id: taskId });
    row.enabled = dto.enabled;
    row.rule = dto.rule;
    return this.recurrences.save(row);
  }

  async createReminder(userId: number, taskId: number, dto: CreateReminderDto) {
    await this.getOwnedTask(userId, taskId);
    return this.reminders.save(
      this.reminders.create({ task_id: taskId, remind_at: new Date(dto.remind_at) }),
    );
  }

  async removeReminder(userId: number, taskId: number, reminderId: number): Promise<void> {
    await this.getOwnedTask(userId, taskId);
    const row = await this.reminders.findOne({ where: { id: reminderId, task_id: taskId } });
    if (!row) throw new NotFoundException('Reminder not found');
    await this.reminders.remove(row);
  }

  async listStatuses(userId: number) {
    await this.ensureDefaults(userId);
    return this.statuses.find({ where: { owner_user_id: userId }, order: { position: 'ASC' } });
  }

  async createStatus(userId: number, dto: CreateStatusDto) {
    return this.statuses.save(
      this.statuses.create({
        owner_user_id: userId,
        name: dto.name,
        slug: dto.slug ?? this.slugify(dto.name),
        position: dto.position ?? 0,
        is_terminal: dto.is_terminal ?? false,
      }),
    );
  }

  async updateStatus(userId: number, id: number, dto: UpdateStatusDto) {
    const row = await this.getOwnedStatus(userId, id);
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.slug !== undefined) row.slug = this.slugify(dto.slug);
    if (dto.position !== undefined) row.position = dto.position;
    if (dto.is_terminal !== undefined) row.is_terminal = dto.is_terminal;
    return this.statuses.save(row);
  }

  async removeStatus(userId: number, id: number): Promise<void> {
    const row = await this.getOwnedStatus(userId, id);
    const count = await this.tasks.count({ where: { owner_user_id: userId, status_id: id } });
    if (count > 0) throw new ConflictException('Status is used by existing tasks.');
    await this.statuses.remove(row);
  }

  async listKanbanColumns(userId: number) {
    await this.ensureDefaults(userId);
    return this.columns.find({ where: { owner_user_id: userId }, order: { position: 'ASC' } });
  }

  async createKanbanColumn(userId: number, dto: CreateKanbanColumnDto) {
    return this.columns.save(
      this.columns.create({
        owner_user_id: userId,
        name: dto.name,
        position: dto.position ?? 0,
      }),
    );
  }

  async updateKanbanColumn(userId: number, id: number, dto: UpdateKanbanColumnDto) {
    const row = await this.getOwnedColumn(userId, id);
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.position !== undefined) row.position = dto.position;
    return this.columns.save(row);
  }

  async removeKanbanColumn(userId: number, id: number): Promise<void> {
    const row = await this.getOwnedColumn(userId, id);
    await this.tasks.update({ owner_user_id: userId, kanban_column_id: id }, { kanban_column_id: null });
    await this.columns.remove(row);
  }

  async listSavedFilters(userId: number) {
    return this.savedFilters.find({ where: { owner_user_id: userId }, order: { created_at: 'DESC' } });
  }

  async createSavedFilter(userId: number, dto: CreateSavedFilterDto) {
    return this.savedFilters.save(
      this.savedFilters.create({ owner_user_id: userId, name: dto.name, criteria: dto.criteria }),
    );
  }

  async updateSavedFilter(userId: number, id: number, dto: UpdateSavedFilterDto) {
    const row = await this.getOwnedSavedFilter(userId, id);
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.criteria !== undefined) row.criteria = dto.criteria;
    return this.savedFilters.save(row);
  }

  async removeSavedFilter(userId: number, id: number): Promise<void> {
    const row = await this.getOwnedSavedFilter(userId, id);
    await this.savedFilters.remove(row);
  }

  private toResponse(task: Task): TaskResponse {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      done: Boolean(task.completed_at || task.status?.slug === 'done'),
      priority: task.priority,
      due_at: task.due_at,
      completed_at: task.completed_at,
      archived_at: task.archived_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
      status: task.status
        ? { id: task.status.id, name: task.status.name, slug: task.status.slug }
        : null,
      kanban_column: task.kanban_column
        ? { id: task.kanban_column.id, name: task.kanban_column.name }
        : null,
      assignments: (task.assignments ?? []).map((assignment) => ({
        id: assignment.id,
        assignee_user_id: assignment.assignee_user_id,
        assigned_by_user_id: assignment.assigned_by_user_id,
      })),
      tags: (task.task_tags ?? []).map((taskTag) => ({
        id: taskTag.tag.id,
        name: taskTag.tag.name,
        color: taskTag.tag.color,
      })),
      subtasks: (task.subtasks ?? []).map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
        done: subtask.done,
        position: subtask.position,
      })),
      dependencies: (task.dependencies ?? []).map((dependency) => ({
        id: dependency.id,
        depends_on_task_id: dependency.depends_on_task_id,
      })),
      reminders: (task.reminders ?? []).map((reminder) => ({
        id: reminder.id,
        remind_at: reminder.remind_at,
        status: reminder.status,
        sent_at: reminder.sent_at,
      })),
    };
  }

  private taskRelations() {
    return {
      status: true,
      kanban_column: true,
      assignments: true,
      task_tags: { tag: true },
      subtasks: true,
      dependencies: true,
      reminders: true,
    };
  }

  private async getOwnedTask(userId: number, id: number): Promise<Task> {
    const task = await this.tasks.findOne({
      where: { id, owner_user_id: userId },
      relations: this.taskRelations(),
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async getOwnedStatus(userId: number, id: number): Promise<TaskStatus> {
    const row = await this.statuses.findOne({ where: { id, owner_user_id: userId } });
    if (!row) throw new NotFoundException('Task status not found');
    return row;
  }

  private async getStatusBySlug(userId: number, slug: string): Promise<TaskStatus> {
    await this.ensureDefaults(userId);
    const row = await this.statuses.findOne({ where: { owner_user_id: userId, slug } });
    if (!row) throw new NotFoundException(`Task status '${slug}' not found`);
    return row;
  }

  private async getOwnedColumn(userId: number, id: number): Promise<KanbanColumn> {
    const row = await this.columns.findOne({ where: { id, owner_user_id: userId } });
    if (!row) throw new NotFoundException('Kanban column not found');
    return row;
  }

  private async getOwnedTag(userId: number, id: number): Promise<Tag> {
    const row = await this.tags.findOne({ where: { id, owner_user_id: userId } });
    if (!row) throw new NotFoundException('Tag not found');
    return row;
  }

  private async getOwnedSavedFilter(userId: number, id: number): Promise<SavedFilter> {
    const row = await this.savedFilters.findOne({ where: { id, owner_user_id: userId } });
    if (!row) throw new NotFoundException('Saved filter not found');
    return row;
  }

  private async findOrCreateTag(userId: number, dto: AddTagDto): Promise<Tag> {
    if (!dto.name) throw new BadRequestException('Provide either tag_id or name.');
    const existing = await this.tags.findOne({ where: { owner_user_id: userId, name: dto.name } });
    if (existing) return existing;
    return this.tags.save(
      this.tags.create({ owner_user_id: userId, name: dto.name, color: dto.color ?? '#1976d2' }),
    );
  }

  private async ensureDefaults(userId: number): Promise<void> {
    for (const status of DEFAULT_STATUSES) {
      const existing = await this.statuses.findOne({ where: { owner_user_id: userId, slug: status.slug } });
      if (!existing) await this.statuses.save(this.statuses.create({ owner_user_id: userId, ...status }));
    }
    for (const column of DEFAULT_COLUMNS) {
      const existing = await this.columns.findOne({ where: { owner_user_id: userId, name: column.name } });
      if (!existing) await this.columns.save(this.columns.create({ owner_user_id: userId, ...column }));
    }
  }

  private async wouldCreateDependencyCycle(taskId: number, dependsOnTaskId: number): Promise<boolean> {
    const visited = new Set<number>();
    const stack = [dependsOnTaskId];

    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      if (current === taskId) return true;
      visited.add(current);

      const rows = await this.dependencies.find({ where: { task_id: current } });
      stack.push(...rows.map((row) => row.depends_on_task_id));
    }
    return false;
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
