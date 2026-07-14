import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import { CreateCommentDto, ListCommentsQueryDto, UpdateCommentDto } from './dto/comment.dto';
import { Comment } from './entities/comment.entity';

interface TaskSnapshot {
  id: number;
  category_id?: number | null;
  project_id?: number | null;
  workspace_id: number | null;
  author_user_id: number;
  title: string;
  assignments?: Array<{ assignee_user_id: number }>;
}

interface TaskPermission {
  taskId: number;
  category_id?: number | null;
  project_id?: number | null;
  workspace_id: number | null;
  author_user_id: number;
  canView: boolean;
  canContribute: boolean;
  canAdmin: boolean;
  canDelete: boolean;
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    private readonly config: ConfigService,
    private readonly events: DomainEventPublisher,
  ) {}

  async list(user: { userId: number; token: string }, query: ListCommentsQueryDto) {
    if (!query.task_id) throw new NotFoundException('Task not found');
    await this.taskPermission(user, query.task_id, 'view');
    const rows = await this.comments.find({
      where: { task_id: query.task_id, deleted_at: IsNull() },
      order: { created_at: 'ASC' },
    });
    return rows.map((comment) => this.toResponse(comment));
  }

  async get(user: { userId: number; token: string }, id: number) {
    const comment = await this.commentOr404(id);
    await this.taskPermission(user, comment.task_id, 'view');
    return this.toResponse(comment);
  }

  async create(user: { userId: number; token: string }, dto: CreateCommentDto) {
    const permission = await this.taskPermission(user, dto.task_id, 'contribute');
    const task = await this.taskSnapshot(dto.task_id);
    const comment = await this.comments.save(
      this.comments.create({
        task_id: dto.task_id,
        category_id: permission.category_id ?? permission.project_id ?? null,
        workspace_id: permission.workspace_id,
        author_user_id: user.userId,
        body: dto.body,
        deleted_at: null,
        deleted_by_user_id: null,
      }),
    );
    await this.publish('task.comment.created', comment, user.userId, task);
    return this.toResponse(comment);
  }

  async update(user: { userId: number; token: string }, id: number, dto: UpdateCommentDto) {
    const comment = await this.commentOr404(id);
    await this.taskPermission(user, comment.task_id, 'view');
    if (comment.author_user_id !== user.userId) {
      throw new ForbiddenException('Only the comment author can update this comment.');
    }
    if (dto.body !== undefined) comment.body = dto.body;
    const saved = await this.comments.save(comment);
    await this.publish('task.comment.updated', saved, user.userId, await this.taskSnapshot(saved.task_id));
    return this.toResponse(saved);
  }

  async remove(user: { userId: number; token: string }, id: number) {
    const comment = await this.commentOr404(id);
    const permission = await this.taskPermission(user, comment.task_id, 'view');
    if (comment.author_user_id !== user.userId && !permission.canDelete && !permission.canAdmin) {
      throw new ForbiddenException('Only the comment author or category admin can delete this comment.');
    }
    comment.deleted_at = new Date();
    comment.deleted_by_user_id = user.userId;
    await this.comments.save(comment);
    await this.publish('task.comment.deleted', comment, user.userId, await this.taskSnapshot(comment.task_id));
  }

  async searchSnapshots(internalKey: string | undefined, page: number, size: number) {
    this.validateInternalKey(internalKey);
    const safePage = Math.max(Number.isFinite(page) ? page : 0, 0);
    const safeSize = Math.min(Math.max(Number.isFinite(size) ? size : 200, 1), 200);
    const rows = await this.comments.find({
      where: { deleted_at: IsNull() },
      order: { id: 'ASC' },
      skip: safePage * safeSize,
      take: safeSize,
    });
    return { items: rows.map((comment) => ({ type: 'comment', ...this.searchableData(comment) })), hasNext: rows.length === safeSize };
  }

  private async commentOr404(id: number) {
    const comment = await this.comments.findOne({ where: { id, deleted_at: IsNull() } });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private async taskPermission(user: { token: string }, taskId: number, action: 'view' | 'contribute') {
    const response = await fetch(`${this.taskBaseUrl()}/api/tasks/${taskId}/permissions`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (response.status === 404) throw new NotFoundException('Task not found');
    if (response.status === 401 || response.status === 403) throw new ForbiddenException('Task access denied.');
    if (!response.ok) throw new ForbiddenException('Task access check failed.');
    const permission = (await response.json()) as TaskPermission;
    if (action === 'view' && !permission.canView) throw new NotFoundException('Task not found');
    if (action === 'contribute' && !permission.canContribute) {
      throw new ForbiddenException('Task contribution permission required.');
    }
    return permission;
  }

  private async taskSnapshot(taskId: number): Promise<TaskSnapshot> {
    const response = await fetch(`${this.taskBaseUrl()}/api/tasks/internal/${taskId}/snapshot`, {
      headers: { 'X-Internal-Key': this.config.get<string>('INTERNAL_API_KEY', '') },
    });
    if (response.status === 404) throw new NotFoundException('Task not found');
    if (!response.ok) throw new ForbiddenException('Task snapshot lookup failed.');
    return (await response.json()) as TaskSnapshot;
  }

  private async publish(eventType: string, comment: Comment, actorUserId: number, task: TaskSnapshot) {
    await this.events.publish({
      eventType,
      actorUserId,
      resource: { type: 'comment', id: comment.id },
      data: {
        ...this.searchableData(comment),
        title: task.title,
        viewerUserIds: [
          task.author_user_id,
          comment.author_user_id,
          ...(task.assignments ?? []).map((assignment) => assignment.assignee_user_id),
        ],
      },
    });
  }

  private searchableData(comment: Comment) {
    return {
      commentId: comment.id,
      resourceId: comment.id,
      taskId: comment.task_id,
      categoryId: comment.category_id,
      projectId: comment.category_id,
      workspaceId: comment.workspace_id,
      authorUserId: comment.author_user_id,
      body: comment.body,
      updatedAt: comment.updated_at,
    };
  }

  private toResponse(comment: Comment) {
    return {
      id: comment.id,
      task_id: comment.task_id,
      category_id: comment.category_id,
      project_id: comment.category_id,
      workspace_id: comment.workspace_id,
      author_user_id: comment.author_user_id,
      body: comment.body,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    };
  }

  private validateInternalKey(internalKey: string | undefined) {
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected || internalKey !== expected) throw new ForbiddenException('Invalid internal API key.');
  }

  private taskBaseUrl(): string {
    return this.config.get<string>('TASK_SERVICE_BASE_URL', 'http://task-service:8000').replace(/\/+$/, '');
  }
}
