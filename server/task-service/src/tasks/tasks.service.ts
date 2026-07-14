import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import {
  AddDependencyDto,
  AddTagDto,
  AssignTaskDto,
  CreateKanbanColumnDto,
  CreateReminderDto,
  CreateSavedFilterDto,
  CreateSubtaskDto,
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateKanbanColumnDto,
  UpdateSavedFilterDto,
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
  TaskActivity,
  TaskAssignment,
  TaskDependency,
  TaskPriority,
  TaskRecurrence,
  TaskReminder,
  TaskStatus,
  TaskTag,
} from './entities/task.entity';
import { DomainEventPublisher } from '../events/domain-event.publisher';

const DEFAULT_COLUMNS = [
  { name: 'Todo', position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Done', position: 2 },
] as const;

export interface TaskResponse {
  id: number;
  category_id: number | null;
  project_id: number | null;
  workspace_id: number | null;
  author_user_id: number;
  title: string;
  description: string;
  done: boolean;
  priority: TaskPriority;
  due_at: Date | null;
  completed_at: Date | null;
  archived_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  status: TaskStatus;
  kanban_column: { id: number; name: string } | null;
  assignments: Array<{ id: number; assignee_user_id: number; assigned_by_user_id: number }>;
  tags: Array<{ id: number; name: string; color: string }>;
  subtasks: Array<{ id: number; title: string; done: boolean; position: number }>;
  dependencies: Array<{ id: number; depends_on_task_id: number }>;
  reminders: Array<{ id: number; remind_at: Date; status: string; sent_at: Date | null }>;
}

export interface TaskActivityResponse {
  id: number;
  task_id: number;
  actor_user_id: number;
  type: string;
  from_value: string | null;
  to_value: string | null;
  message: string;
  created_at: Date;
}

export interface SearchSnapshotPage {
  items: Array<Record<string, unknown>>;
  hasNext: boolean;
}

interface CategoryPermission {
  categoryId: number;
  projectId?: number;
  workspaceId: number;
  workspaceName: string;
  categoryRole?: 'CATEGORY_OWNER' | 'CATEGORY_ADMIN' | 'CONTRIBUTOR' | 'VIEWER' | null;
  projectRole?: 'CATEGORY_OWNER' | 'CATEGORY_ADMIN' | 'CONTRIBUTOR' | 'VIEWER' | null;
  canView: boolean;
  canContribute: boolean;
  canAdmin: boolean;
  canDelete: boolean;
}

interface CategorySummary {
  id: number;
  workspace_id: number;
}

interface WorkspaceSummary {
  id: number;
  workspaceType?: 'PERSONAL' | 'TEAM';
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    @InjectRepository(TaskActivity)
    private readonly activities: Repository<TaskActivity>,
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
    private readonly config: ConfigService,
    private readonly events: DomainEventPublisher,
  ) {}

  async findAll(user: { userId: number; token: string }, query: ListTasksQueryDto): Promise<TaskResponse[]> {
    const userId = user.userId;
    await this.ensureDefaults(userId);
    await this.migrateVisibleLegacyTasks(user);
    let where: FindOptionsWhere<Task>[] | FindOptionsWhere<Task>;
    const categoryId = query.category_id ?? query.project_id;
    if (categoryId) {
      await this.requireCategoryPermission(user, categoryId, 'view');
      where = { project_id: categoryId, deleted_at: IsNull() };
    } else if (query.workspace_id) {
      const visibleCategoryIds = await this.visibleCategoryIds(user, query.workspace_id);
      where = { project_id: In(visibleCategoryIds), deleted_at: IsNull() };
    } else {
      const visibleCategoryIds = await this.visibleCategoryIds(user);
      where = { project_id: In(visibleCategoryIds), deleted_at: IsNull() };
    }
    const applyFilters = (item: FindOptionsWhere<Task>) => {
      if (!query.include_archived) item.archived_at = IsNull();
      if (query.status) item.status = query.status;
      if (query.priority) item.priority = query.priority;
      return item;
    };
    where = Array.isArray(where) ? where.map(applyFilters) : applyFilters(where);

    const rows = await this.tasks.find({
      where,
      order: { created_at: 'DESC' },
      relations: this.taskRelations(),
    });
    return rows.map((task) => this.toResponse(task));
  }

  async create(user: { userId: number; token: string }, dto: CreateTaskDto): Promise<TaskResponse> {
    const userId = user.userId;
    await this.ensureDefaults(userId);
    const categoryId = dto.category_id ?? dto.project_id;
    if (!categoryId) throw new BadRequestException('category_id is required.');
    const category = await this.requireCategoryPermission(user, categoryId, 'contribute');
    const status = this.statusFromDto(dto);
    const column = dto.kanban_column_id
      ? await this.getOwnedColumn(userId, dto.kanban_column_id)
      : null;

    const task = this.tasks.create({
      owner_user_id: userId,
      author_user_id: userId,
      project_id: categoryId,
      workspace_id: category.workspaceId,
      title: dto.title,
      description: dto.description ?? '',
      status,
      priority: dto.priority ?? TaskPriority.NORMAL,
      due_at: dto.due_at ? new Date(dto.due_at) : null,
      completed_at: status === TaskStatus.DONE ? new Date() : null,
      archived_at: status === TaskStatus.ARCHIVED ? new Date() : null,
      kanban_column_id: column?.id ?? null,
    });
    const saved = await this.tasks.save(task);
    const response = await this.findOne(user, saved.id);
    await this.recordActivity(saved.id, userId, 'task_created', null, response.status, 'created this task');
    await this.events.publish({
      eventType: 'task.created',
      actorUserId: userId,
      resource: { type: 'task', id: response.id },
      data: this.searchableTaskEventData(response),
    });
    return response;
  }

  async findOne(user: { userId: number; token: string }, id: number): Promise<TaskResponse> {
    return this.toResponse(await this.getVisibleTask(user, id));
  }

  async update(user: { userId: number; token: string }, id: number, dto: UpdateTaskDto): Promise<TaskResponse> {
    const userId = user.userId;
    const task = await this.getContributableTask(user, id);
    const oldStatus = task.status;
    const oldPriority = task.priority;
    const wasCompleted = task.status === TaskStatus.DONE;

    const requestedCategoryId = dto.category_id ?? dto.project_id;
    if (requestedCategoryId !== undefined && requestedCategoryId !== task.project_id) {
      throw new BadRequestException('Task category cannot be changed.');
    }
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.due_at !== undefined) task.due_at = dto.due_at ? new Date(dto.due_at) : null;
    if (dto.kanban_column_id !== undefined) {
      const column = dto.kanban_column_id ? await this.getOwnedColumn(userId, dto.kanban_column_id) : null;
      task.kanban_column_id = column?.id ?? null;
      task.kanban_column = column;
    }
    const nextStatus = this.statusFromDto(dto, task.status);
    if (nextStatus !== task.status) {
      task.status = nextStatus;
      if (nextStatus === TaskStatus.DONE && !task.completed_at) task.completed_at = new Date();
      if (nextStatus !== TaskStatus.DONE) task.completed_at = null;
      if (nextStatus === TaskStatus.ARCHIVED && !task.archived_at) task.archived_at = new Date();
      if (nextStatus !== TaskStatus.ARCHIVED) task.archived_at = null;
    }

    await this.tasks.save(task);
    const response = await this.findOne(user, id);
    if (oldStatus !== response.status) {
      await this.recordActivity(
        id,
        userId,
        'status_changed',
        oldStatus,
        response.status,
        `changed status from ${this.statusLabel(oldStatus)} to ${this.statusLabel(response.status)}`,
      );
    }
    if (oldPriority !== response.priority) {
      await this.recordActivity(
        id,
        userId,
        'priority_changed',
        oldPriority,
        response.priority,
        `changed priority from ${oldPriority} to ${response.priority}`,
      );
    }
    await this.events.publish({
      eventType: 'task.updated',
      actorUserId: userId,
      resource: { type: 'task', id: response.id },
      data: this.searchableTaskEventData(response),
    });
    if (!wasCompleted && response.done) {
      await this.events.publish({
        eventType: 'task.completed',
        actorUserId: userId,
        resource: { type: 'task', id: response.id },
        data: {
          taskId: response.id,
          workspaceId: response.workspace_id,
          ownerUserId: response.author_user_id,
          title: response.title,
          viewerUserIds: [
            response.author_user_id,
            ...response.assignments.map((assignment) => assignment.assignee_user_id),
          ],
          completedAt: response.completed_at,
        },
      });
    }
    return response;
  }

  async remove(user: { userId: number; token: string }, id: number): Promise<void> {
    const task = await this.getVisibleTask(user, id);
    await this.requireDeletePermission(user, task.author_user_id ?? task.owner_user_id, task.project_id);
    task.deleted_at = new Date();
    task.deleted_by_user_id = user.userId;
    await this.tasks.save(task);
    await this.events.publish({
      eventType: 'task.deleted',
      actorUserId: user.userId,
      resource: { type: 'task', id },
      data: {
        taskId: id,
        workspaceId: task.workspace_id,
      },
    });
  }

  async complete(user: { userId: number; token: string }, id: number): Promise<TaskResponse> {
    return this.update(user, id, { done: true });
  }

  async archive(user: { userId: number; token: string }, id: number): Promise<TaskResponse> {
    return this.update(user, id, { status: TaskStatus.ARCHIVED });
  }

  async addAssignment(user: { userId: number; token: string }, taskId: number, dto: AssignTaskDto) {
    const task = await this.getContributableTask(user, taskId);
    if (dto.assignee_user_id <= 0) throw new BadRequestException('Assignee must be a positive user id.');
    const row = this.assignments.create({
      task_id: taskId,
      assignee_user_id: dto.assignee_user_id,
      assigned_by_user_id: user.userId,
    });
    try {
      const assignment = await this.assignments.save(row);
      const response = await this.findOne(user, taskId);
      await this.events.publish({
        eventType: 'task.assigned',
        actorUserId: user.userId,
        resource: { type: 'task', id: taskId },
        data: {
          taskId,
          workspaceId: task.workspace_id,
          assigneeUserId: dto.assignee_user_id,
          assignedByUserId: user.userId,
        },
      });
      await this.recordActivity(
        taskId,
        user.userId,
        'assignment_added',
        null,
        String(dto.assignee_user_id),
        `assigned user ${dto.assignee_user_id}`,
      );
      await this.events.publish({
        eventType: 'task.updated',
        actorUserId: user.userId,
        resource: { type: 'task', id: taskId },
        data: this.searchableTaskEventData(response),
      });
      return assignment;
    } catch {
      throw new ConflictException('Task is already assigned to this user.');
    }
  }

  async removeAssignment(user: { userId: number; token: string }, taskId: number, assigneeUserId: number): Promise<void> {
    await this.getContributableTask(user, taskId);
    const row = await this.assignments.findOne({
      where: { task_id: taskId, assignee_user_id: assigneeUserId },
    });
    if (!row) throw new NotFoundException('Assignment not found');
    await this.assignments.remove(row);
    await this.recordActivity(
      taskId,
      user.userId,
      'assignment_removed',
      String(assigneeUserId),
      null,
      `removed user ${assigneeUserId} from assignees`,
    );
    const response = await this.findOne(user, taskId);
    await this.events.publish({
      eventType: 'task.updated',
      actorUserId: user.userId,
      resource: { type: 'task', id: taskId },
      data: this.searchableTaskEventData(response),
    });
  }

  async addTag(user: { userId: number; token: string }, taskId: number, dto: AddTagDto) {
    const userId = user.userId;
    await this.getContributableTask(user, taskId);
    const tag = dto.tag_id
      ? await this.getOwnedTag(userId, dto.tag_id)
      : await this.findOrCreateTag(userId, dto);
    const row = this.taskTags.create({ task_id: taskId, tag_id: tag.id });
    try {
      await this.taskTags.save(row);
    } catch {
      throw new ConflictException('Tag is already attached to this task.');
    }
    const response = await this.findOne(user, taskId);
    await this.events.publish({
      eventType: 'task.updated',
      actorUserId: user.userId,
      resource: { type: 'task', id: taskId },
      data: this.searchableTaskEventData(response),
    });
    return response;
  }

  async removeTag(user: { userId: number; token: string }, taskId: number, tagId: number): Promise<void> {
    await this.getContributableTask(user, taskId);
    const row = await this.taskTags.findOne({ where: { task_id: taskId, tag_id: tagId } });
    if (!row) throw new NotFoundException('Task tag not found');
    await this.taskTags.remove(row);
    const response = await this.findOne(user, taskId);
    await this.events.publish({
      eventType: 'task.updated',
      actorUserId: user.userId,
      resource: { type: 'task', id: taskId },
      data: this.searchableTaskEventData(response),
    });
  }

  async createSubtask(user: { userId: number; token: string }, taskId: number, dto: CreateSubtaskDto) {
    await this.getContributableTask(user, taskId);
    const row = this.subtasks.create({
      task_id: taskId,
      title: dto.title,
      done: dto.done ?? false,
      position: dto.position ?? 0,
    });
    return this.subtasks.save(row);
  }

  async updateSubtask(user: { userId: number; token: string }, taskId: number, subtaskId: number, dto: UpdateSubtaskDto) {
    await this.getContributableTask(user, taskId);
    const row = await this.subtasks.findOne({ where: { id: subtaskId, task_id: taskId } });
    if (!row) throw new NotFoundException('Subtask not found');
    if (dto.title !== undefined) row.title = dto.title;
    if (dto.done !== undefined) row.done = dto.done;
    if (dto.position !== undefined) row.position = dto.position;
    return this.subtasks.save(row);
  }

  async removeSubtask(user: { userId: number; token: string }, taskId: number, subtaskId: number): Promise<void> {
    await this.getContributableTask(user, taskId);
    const row = await this.subtasks.findOne({ where: { id: subtaskId, task_id: taskId } });
    if (!row) throw new NotFoundException('Subtask not found');
    await this.subtasks.remove(row);
  }

  async addDependency(user: { userId: number; token: string }, taskId: number, dto: AddDependencyDto) {
    await this.getContributableTask(user, taskId);
    await this.getContributableTask(user, dto.depends_on_task_id);
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

  async removeDependency(user: { userId: number; token: string }, taskId: number, dependencyId: number): Promise<void> {
    await this.getContributableTask(user, taskId);
    const row = await this.dependencies.findOne({ where: { id: dependencyId, task_id: taskId } });
    if (!row) throw new NotFoundException('Dependency not found');
    await this.dependencies.remove(row);
  }

  async upsertRecurrence(user: { userId: number; token: string }, taskId: number, dto: UpsertRecurrenceDto) {
    await this.getContributableTask(user, taskId);
    let row = await this.recurrences.findOne({ where: { task_id: taskId } });
    row ??= this.recurrences.create({ task_id: taskId });
    row.enabled = dto.enabled;
    row.rule = dto.rule;
    return this.recurrences.save(row);
  }

  async createReminder(user: { userId: number; token: string }, taskId: number, dto: CreateReminderDto) {
    await this.getContributableTask(user, taskId);
    return this.reminders.save(
      this.reminders.create({ task_id: taskId, remind_at: new Date(dto.remind_at) }),
    );
  }

  async removeReminder(user: { userId: number; token: string }, taskId: number, reminderId: number): Promise<void> {
    await this.getContributableTask(user, taskId);
    const row = await this.reminders.findOne({ where: { id: reminderId, task_id: taskId } });
    if (!row) throw new NotFoundException('Reminder not found');
    await this.reminders.remove(row);
  }

  async listActivity(user: { userId: number; token: string }, taskId: number): Promise<TaskActivityResponse[]> {
    await this.getVisibleTask(user, taskId);
    const rows = await this.activities.find({
      where: { task_id: taskId },
      order: { created_at: 'DESC' },
      take: 100,
    });
    return rows.map((activity) => this.toActivityResponse(activity));
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

  async taskSearchSnapshots(page: number, size: number): Promise<SearchSnapshotPage> {
    const safePage = Math.max(page, 0);
    const safeSize = Math.min(Math.max(size, 1), 200);
    const rows = await this.tasks.find({
      where: { deleted_at: IsNull() },
      relations: this.taskRelations(),
      order: { id: 'ASC' },
      skip: safePage * safeSize,
      take: safeSize,
    });
    return {
      items: rows.map((task) => this.searchableTaskDocument(task)),
      hasNext: rows.length === safeSize,
    };
  }

  async taskPermission(user: { userId: number; token: string }, taskId: number) {
    const task = await this.getVisibleTask(user, taskId);
    const permission = task.project_id
      ? await this.categoryPermission(user, task.project_id)
      : null;
    const authorId = task.author_user_id ?? task.owner_user_id;
    return {
      taskId,
      category_id: task.project_id,
      project_id: task.project_id,
      workspace_id: task.workspace_id,
      author_user_id: authorId,
      canView: true,
      canContribute: permission?.canContribute ?? authorId === user.userId,
      canAdmin: permission?.canAdmin ?? false,
      canDelete: authorId === user.userId || Boolean(permission?.canAdmin),
    };
  }

  async internalTaskSnapshot(internalKey: string | undefined, taskId: number) {
    this.validateInternalKey(internalKey);
    const task = await this.tasks.findOne({
      where: { id: taskId, deleted_at: IsNull() },
      relations: this.taskRelations(),
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.toResponse(task);
  }

  private toResponse(task: Task): TaskResponse {
    return {
      id: task.id,
      category_id: task.project_id,
      project_id: task.project_id,
      workspace_id: task.workspace_id,
      author_user_id: task.author_user_id ?? task.owner_user_id,
      title: task.title,
      description: task.description,
      done: task.status === TaskStatus.DONE,
      priority: task.priority,
      due_at: task.due_at,
      completed_at: task.completed_at,
      archived_at: task.archived_at,
      deleted_at: task.deleted_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
      status: task.status,
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

  private toActivityResponse(activity: TaskActivity): TaskActivityResponse {
    return {
      id: activity.id,
      task_id: activity.task_id,
      actor_user_id: activity.actor_user_id,
      type: activity.type,
      from_value: activity.from_value,
      to_value: activity.to_value,
      message: activity.message,
      created_at: activity.created_at,
    };
  }

  private searchableTaskEventData(task: TaskResponse): Record<string, unknown> {
    return {
      taskId: task.id,
      resourceId: task.id,
      categoryId: task.project_id,
      projectId: task.project_id,
      workspaceId: task.workspace_id,
      authorUserId: task.author_user_id,
      ownerUserId: task.author_user_id,
      title: task.title,
      description: task.description,
      status: task.status,
      statusName: this.statusLabel(task.status),
      priority: task.priority,
      tags: task.tags.map((tag) => tag.name),
      viewerUserIds: [
        task.author_user_id,
        ...task.assignments.map((assignment) => assignment.assignee_user_id),
      ],
      updatedAt: task.updated_at,
    };
  }

  private searchableTaskDocument(task: Task): Record<string, unknown> {
    const response = this.toResponse(task);
    return {
      type: 'task',
      ...this.searchableTaskEventData(response),
    };
  }

  private taskRelations() {
    return {
      kanban_column: true,
      assignments: true,
      task_tags: { tag: true },
      subtasks: true,
      dependencies: true,
      reminders: true,
    };
  }

  private async getVisibleTask(user: { userId: number; token: string }, id: number): Promise<Task> {
    const task = await this.tasks.findOne({
      where: { id, deleted_at: IsNull() },
      relations: this.taskRelations(),
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.project_id == null) {
      await this.attachDefaultProject(user, task);
    }
    if (!task.project_id) throw new NotFoundException('Task not found');
    await this.requireCategoryPermission(user, task.project_id, 'view');
    return task;
  }

  private async getContributableTask(user: { userId: number; token: string }, id: number): Promise<Task> {
    const task = await this.getVisibleTask(user, id);
    if (!task.project_id) throw new ForbiddenException('Task access denied.');
    await this.requireCategoryPermission(user, task.project_id, 'contribute');
    return task;
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
    for (const column of DEFAULT_COLUMNS) {
      const existing = await this.columns.findOne({ where: { owner_user_id: userId, name: column.name } });
      if (!existing) await this.columns.save(this.columns.create({ owner_user_id: userId, ...column }));
    }
  }

  private statusFromDto(dto: Pick<CreateTaskDto, 'status' | 'done'>, fallback = TaskStatus.TODO): TaskStatus {
    if (dto.status !== undefined) return dto.status;
    if (dto.done !== undefined) return dto.done ? TaskStatus.DONE : TaskStatus.TODO;
    return fallback;
  }

  private statusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.BACKLOG:
        return 'Backlog';
      case TaskStatus.TODO:
        return 'Todo';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.REVIEW:
        return 'Review';
      case TaskStatus.DONE:
        return 'Done';
      case TaskStatus.ARCHIVED:
        return 'Archived';
    }
  }

  private async recordActivity(
    taskId: number,
    actorUserId: number,
    type: string,
    fromValue: string | null,
    toValue: string | null,
    message: string,
  ): Promise<TaskActivity> {
    return this.activities.save(
      this.activities.create({
        task_id: taskId,
        actor_user_id: actorUserId,
        type,
        from_value: fromValue,
        to_value: toValue,
        message,
      }),
    );
  }

  private async visibleCategoryIds(user: { userId: number; token: string }, workspaceId?: number): Promise<number[]> {
    const suffix = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const response = await fetch(`${this.categoryBaseUrl()}/api/categories${suffix}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!response.ok) {
      throw new ForbiddenException('Category access check failed.');
    }
    const categories = (await response.json()) as CategorySummary[];
    return categories.map((category) => category.id);
  }

  private async migrateVisibleLegacyTasks(user: { userId: number; token: string }): Promise<void> {
    const visibleWorkspaceIds = await this.visibleWorkspaceIds(user);
    if (!visibleWorkspaceIds.length) return;
    const rows = await this.tasks.find({
      where: { project_id: IsNull(), workspace_id: In(visibleWorkspaceIds), deleted_at: IsNull() },
      take: 200,
    });
    for (const task of rows) {
      await this.attachDefaultProject(user, task);
    }
  }

  private async visibleWorkspaceIds(user: { userId: number; token: string }): Promise<number[]> {
    const response = await fetch(`${this.workspaceBaseUrl()}/api/workspaces/`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!response.ok) return [];
    const workspaces = (await response.json()) as WorkspaceSummary[];
    return workspaces.map((workspace) => workspace.id);
  }

  private async requireCategoryPermission(
    user: { userId: number; token: string },
    categoryId: number,
    action: 'view' | 'contribute',
  ): Promise<CategoryPermission> {
    const permission = await this.categoryPermission(user, categoryId);
    if (action === 'view' && !permission.canView) throw new NotFoundException('Category not found');
    if (action === 'contribute' && !permission.canContribute) {
      throw new ForbiddenException('Category contribution permission required.');
    }
    return permission;
  }

  private async categoryPermission(
    user: { userId: number; token: string },
    categoryId: number,
  ): Promise<CategoryPermission> {
    const response = await fetch(`${this.categoryBaseUrl()}/api/categories/${categoryId}/permissions/me`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (response.status === 404) throw new NotFoundException('Category not found');
    if (response.status === 403 || response.status === 401) throw new ForbiddenException('Category access denied.');
    if (!response.ok) throw new ForbiddenException('Category access check failed.');
    return (await response.json()) as CategoryPermission;
  }

  private async requireDeletePermission(
    user: { userId: number; token: string },
    authorUserId: number,
    projectId: number | null,
  ): Promise<void> {
    if (authorUserId === user.userId) return;
    if (projectId != null) {
      const permission = await this.categoryPermission(user, projectId);
      if (permission.canDelete) return;
    }
    throw new ForbiddenException('Only the original author or project admin can delete this resource.');
  }

  private async attachDefaultProject(user: { userId: number; token: string }, task: Task): Promise<void> {
    if (!task.workspace_id) throw new NotFoundException('Task not found');
    const response = await fetch(`${this.categoryBaseUrl()}/api/categories/internal/default`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': this.config.get<string>('INTERNAL_API_KEY', ''),
      },
      body: JSON.stringify({
        workspace_id: task.workspace_id,
        author_user_id: task.author_user_id ?? task.owner_user_id ?? user.userId,
      }),
    });
    if (!response.ok) throw new ForbiddenException('Could not migrate task to a default category.');
    const category = (await response.json()) as CategorySummary;
    task.project_id = category.id;
    task.workspace_id = category.workspace_id;
    await this.tasks.save(task);
  }

  private categoryBaseUrl(): string {
    return this.config.get<string>('CATEGORY_SERVICE_BASE_URL', this.config.get<string>('PROJECT_SERVICE_BASE_URL', 'http://category-service:8000')).replace(/\/+$/, '');
  }

  private validateInternalKey(internalKey: string | undefined) {
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected || internalKey !== expected) throw new ForbiddenException('Invalid internal API key.');
  }

  private workspaceBaseUrl(): string {
    return this.config.get<string>('WORKSPACE_SERVICE_BASE_URL', 'http://workspace-service:8000').replace(/\/+$/, '');
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
