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
  CreateCommentDto,
  CreateKanbanColumnDto,
  CreateReminderDto,
  CreateSavedFilterDto,
  CreateStatusDto,
  CreateSubtaskDto,
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateKanbanColumnDto,
  UpdateCommentDto,
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
  TaskComment,
  TaskDependency,
  TaskPriority,
  TaskRecurrence,
  TaskReminder,
  TaskStatus,
  TaskTag,
} from './entities/task.entity';
import { DomainEventPublisher } from '../events/domain-event.publisher';

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
  status: { id: number; name: string; slug: string } | null;
  kanban_column: { id: number; name: string } | null;
  assignments: Array<{ id: number; assignee_user_id: number; assigned_by_user_id: number }>;
  tags: Array<{ id: number; name: string; color: string }>;
  subtasks: Array<{ id: number; title: string; done: boolean; position: number }>;
  dependencies: Array<{ id: number; depends_on_task_id: number }>;
  reminders: Array<{ id: number; remind_at: Date; status: string; sent_at: Date | null }>;
}

export interface TaskCommentResponse {
  id: number;
  task_id: number;
  author_user_id: number;
  body: string;
  created_at: Date;
  updated_at: Date;
}

export interface SearchSnapshotPage {
  items: Array<Record<string, unknown>>;
  hasNext: boolean;
}

interface WorkspacePermission {
  workspaceId: number;
  visibility: 'PRIVATE' | 'PUBLIC';
  isMember: boolean;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  canView: boolean;
  canContribute: boolean;
  canAdmin: boolean;
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
    @InjectRepository(TaskComment)
    private readonly comments: Repository<TaskComment>,
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
    private readonly config: ConfigService,
    private readonly events: DomainEventPublisher,
  ) {}

  async findAll(user: { userId: number; token: string }, query: ListTasksQueryDto): Promise<TaskResponse[]> {
    const userId = user.userId;
    await this.ensureDefaults(userId);
    let where: FindOptionsWhere<Task>[] | FindOptionsWhere<Task>;
    if (query.workspace_id) {
      await this.requireWorkspacePermission(user, query.workspace_id, 'view');
      where = { workspace_id: query.workspace_id, deleted_at: IsNull() };
    } else {
      const visibleWorkspaceIds = await this.visibleWorkspaceIds(user);
      where = [
        { workspace_id: In(visibleWorkspaceIds), deleted_at: IsNull() },
        { workspace_id: IsNull(), owner_user_id: userId, deleted_at: IsNull() },
      ];
    }
    const applyFilters = (item: FindOptionsWhere<Task>) => {
      if (!query.include_archived) item.archived_at = IsNull();
      if (query.status_id) item.status_id = query.status_id;
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
    const workspaceId = dto.workspace_id ?? (await this.personalWorkspaceId(user));
    await this.requireWorkspacePermission(user, workspaceId, 'contribute');
    const status = dto.status_id
      ? await this.getOwnedStatus(userId, dto.status_id)
      : await this.getStatusBySlug(userId, dto.done ? 'done' : 'todo');
    const column = dto.kanban_column_id
      ? await this.getOwnedColumn(userId, dto.kanban_column_id)
      : null;

    const task = this.tasks.create({
      owner_user_id: userId,
      author_user_id: userId,
      workspace_id: workspaceId,
      title: dto.title,
      description: dto.description ?? '',
      status_id: status.id,
      priority: dto.priority ?? TaskPriority.NORMAL,
      due_at: dto.due_at ? new Date(dto.due_at) : null,
      completed_at: dto.done ? new Date() : null,
      archived_at: status.slug === 'archived' ? new Date() : null,
      kanban_column_id: column?.id ?? null,
    });
    const saved = await this.tasks.save(task);
    const response = await this.findOne(user, saved.id);
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
    const wasCompleted = Boolean(task.completed_at || task.status?.slug === 'done');

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
    const response = await this.findOne(user, id);
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
    await this.requireDeletePermission(user, task.author_user_id ?? task.owner_user_id, task.workspace_id);
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
    const status = await this.getStatusBySlug(user.userId, 'archived');
    const task = await this.getContributableTask(user, id);
    task.status_id = status.id;
    task.archived_at = task.archived_at ?? new Date();
    await this.tasks.save(task);
    const response = await this.findOne(user, id);
    await this.events.publish({
      eventType: 'task.updated',
      actorUserId: user.userId,
      resource: { type: 'task', id },
      data: this.searchableTaskEventData(response),
    });
    return response;
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

  async listComments(user: { userId: number; token: string }, taskId: number): Promise<TaskCommentResponse[]> {
    await this.getVisibleTask(user, taskId);
    const rows = await this.comments.find({
      where: { task_id: taskId, deleted_at: IsNull() },
      order: { created_at: 'ASC' },
    });
    return rows.map((comment) => this.toCommentResponse(comment));
  }

  async createComment(
    user: { userId: number; token: string },
    taskId: number,
    dto: CreateCommentDto,
  ): Promise<TaskCommentResponse> {
    const task = await this.getContributableTask(user, taskId);
    const comment = this.comments.create({
      task_id: taskId,
      author_user_id: user.userId,
      body: dto.body,
    });
    const response = this.toCommentResponse(await this.comments.save(comment));
    await this.events.publish({
      eventType: 'task.comment.created',
      actorUserId: user.userId,
      resource: { type: 'comment', id: response.id },
      data: this.searchableCommentEventData(response, task),
    });
    return response;
  }

  async updateComment(
    user: { userId: number; token: string },
    taskId: number,
    commentId: number,
    dto: UpdateCommentDto,
  ): Promise<TaskCommentResponse> {
    const task = await this.getVisibleTask(user, taskId);
    const comment = await this.getVisibleComment(taskId, commentId);
    if (comment.author_user_id !== user.userId) {
      throw new ForbiddenException('Only the comment author can update this comment.');
    }
    if (dto.body !== undefined) comment.body = dto.body;
    const response = this.toCommentResponse(await this.comments.save(comment));
    await this.events.publish({
      eventType: 'task.comment.updated',
      actorUserId: user.userId,
      resource: { type: 'comment', id: response.id },
      data: this.searchableCommentEventData(response, task),
    });
    return response;
  }

  async removeComment(user: { userId: number; token: string }, taskId: number, commentId: number): Promise<void> {
    const task = await this.getVisibleTask(user, taskId);
    const comment = await this.getVisibleComment(taskId, commentId);
    await this.requireDeletePermission(user, comment.author_user_id, task.workspace_id);
    comment.deleted_at = new Date();
    comment.deleted_by_user_id = user.userId;
    await this.comments.save(comment);
    await this.events.publish({
      eventType: 'task.comment.deleted',
      actorUserId: user.userId,
      resource: { type: 'comment', id: commentId },
      data: {
        commentId,
        taskId,
        workspaceId: task.workspace_id,
      },
    });
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

  async commentSearchSnapshots(page: number, size: number): Promise<SearchSnapshotPage> {
    const safePage = Math.max(page, 0);
    const safeSize = Math.min(Math.max(size, 1), 200);
    const rows = await this.comments.find({
      where: { deleted_at: IsNull() },
      relations: { task: { status: true, assignments: true } },
      order: { id: 'ASC' },
      skip: safePage * safeSize,
      take: safeSize,
    });
    return {
      items: rows
        .filter((comment) => comment.task && !comment.task.deleted_at)
        .map((comment) => this.searchableCommentDocument(comment, comment.task)),
      hasNext: rows.length === safeSize,
    };
  }

  async commentPermission(user: { userId: number; token: string }, taskId: number, commentId: number) {
    const task = await this.getVisibleTask(user, taskId);
    const comment = await this.getVisibleComment(taskId, commentId);
    const permission = task.workspace_id
      ? await this.workspacePermission(user, task.workspace_id)
      : null;
    return {
      taskId,
      commentId,
      workspace_id: task.workspace_id,
      author_user_id: comment.author_user_id,
      canView: true,
      canContribute: permission?.canContribute ?? comment.author_user_id === user.userId,
      canAdmin: permission?.canAdmin ?? false,
      canDelete: comment.author_user_id === user.userId || Boolean(permission?.canAdmin),
    };
  }

  async taskPermission(user: { userId: number; token: string }, taskId: number) {
    const task = await this.getVisibleTask(user, taskId);
    const permission = task.workspace_id
      ? await this.workspacePermission(user, task.workspace_id)
      : null;
    const authorId = task.author_user_id ?? task.owner_user_id;
    return {
      taskId,
      workspace_id: task.workspace_id,
      author_user_id: authorId,
      canView: true,
      canContribute: permission?.canContribute ?? authorId === user.userId,
      canAdmin: permission?.canAdmin ?? false,
      canDelete: authorId === user.userId || Boolean(permission?.canAdmin),
    };
  }

  private toResponse(task: Task): TaskResponse {
    return {
      id: task.id,
      workspace_id: task.workspace_id,
      author_user_id: task.author_user_id ?? task.owner_user_id,
      title: task.title,
      description: task.description,
      done: Boolean(task.completed_at || task.status?.slug === 'done'),
      priority: task.priority,
      due_at: task.due_at,
      completed_at: task.completed_at,
      archived_at: task.archived_at,
      deleted_at: task.deleted_at,
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

  private toCommentResponse(comment: TaskComment): TaskCommentResponse {
    return {
      id: comment.id,
      task_id: comment.task_id,
      author_user_id: comment.author_user_id,
      body: comment.body,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    };
  }

  private searchableTaskEventData(task: TaskResponse): Record<string, unknown> {
    return {
      taskId: task.id,
      resourceId: task.id,
      workspaceId: task.workspace_id,
      authorUserId: task.author_user_id,
      ownerUserId: task.author_user_id,
      title: task.title,
      description: task.description,
      status: task.status?.slug,
      statusName: task.status?.name,
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

  private searchableCommentEventData(comment: TaskCommentResponse, task: Task): Record<string, unknown> {
    return {
      commentId: comment.id,
      resourceId: comment.id,
      taskId: comment.task_id,
      workspaceId: task.workspace_id,
      authorUserId: comment.author_user_id,
      body: comment.body,
      viewerUserIds: [
        task.author_user_id ?? task.owner_user_id,
        comment.author_user_id,
        ...(task.assignments ?? []).map((assignment) => assignment.assignee_user_id),
      ],
      updatedAt: comment.updated_at,
    };
  }

  private searchableCommentDocument(comment: TaskComment, task: Task): Record<string, unknown> {
    return {
      type: 'comment',
      ...this.searchableCommentEventData(this.toCommentResponse(comment), task),
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

  private async getVisibleTask(user: { userId: number; token: string }, id: number): Promise<Task> {
    const task = await this.tasks.findOne({
      where: { id, deleted_at: IsNull() },
      relations: this.taskRelations(),
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.workspace_id == null) {
      if (task.owner_user_id !== user.userId) throw new NotFoundException('Task not found');
      return task;
    }
    await this.requireWorkspacePermission(user, task.workspace_id, 'view');
    return task;
  }

  private async getContributableTask(user: { userId: number; token: string }, id: number): Promise<Task> {
    const task = await this.getVisibleTask(user, id);
    if (task.workspace_id == null) {
      if (task.owner_user_id !== user.userId) throw new ForbiddenException('Task access denied.');
      return task;
    }
    await this.requireWorkspacePermission(user, task.workspace_id, 'contribute');
    return task;
  }

  private async getVisibleComment(taskId: number, commentId: number): Promise<TaskComment> {
    const comment = await this.comments.findOne({
      where: { id: commentId, task_id: taskId, deleted_at: IsNull() },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
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

  private async visibleWorkspaceIds(user: { userId: number; token: string }): Promise<number[]> {
    const response = await fetch(`${this.workspaceBaseUrl()}/api/workspaces/`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!response.ok) {
      throw new ForbiddenException('Workspace access check failed.');
    }
    const workspaces = (await response.json()) as WorkspaceSummary[];
    return workspaces.map((workspace) => workspace.id);
  }

  private async personalWorkspaceId(user: { userId: number; token: string }): Promise<number> {
    const response = await fetch(`${this.workspaceBaseUrl()}/api/workspaces/`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!response.ok) {
      throw new ForbiddenException('Could not resolve personal workspace.');
    }
    const workspaces = (await response.json()) as WorkspaceSummary[];
    const personal = workspaces.find((workspace) => workspace.workspaceType === 'PERSONAL');
    if (!personal) throw new NotFoundException('Personal workspace not found');
    return personal.id;
  }

  private async requireWorkspacePermission(
    user: { userId: number; token: string },
    workspaceId: number,
    action: 'view' | 'contribute',
  ): Promise<WorkspacePermission> {
    const permission = await this.workspacePermission(user, workspaceId);
    if (action === 'view' && !permission.canView) throw new NotFoundException('Workspace not found');
    if (action === 'contribute' && !permission.canContribute) {
      throw new ForbiddenException('Workspace contribution permission required.');
    }
    return permission;
  }

  private async workspacePermission(
    user: { userId: number; token: string },
    workspaceId: number,
  ): Promise<WorkspacePermission> {
    const response = await fetch(`${this.workspaceBaseUrl()}/api/workspaces/${workspaceId}/permissions/me`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (response.status === 404) throw new NotFoundException('Workspace not found');
    if (response.status === 403 || response.status === 401) throw new ForbiddenException('Workspace access denied.');
    if (!response.ok) throw new ForbiddenException('Workspace access check failed.');
    return (await response.json()) as WorkspacePermission;
  }

  private async requireDeletePermission(
    user: { userId: number; token: string },
    authorUserId: number,
    workspaceId: number | null,
  ): Promise<void> {
    if (authorUserId === user.userId) return;
    if (workspaceId != null) {
      const permission = await this.workspacePermission(user, workspaceId);
      if (permission.canAdmin) return;
    }
    throw new ForbiddenException('Only the original author or workspace admin can delete this resource.');
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
