import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import {
  ChangeCategoryRoleDto,
  CreateCategoryDto,
  InviteCategoryMemberDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import {
  Category,
  CategoryInvitation,
  CategoryInvitationStatus,
  CategoryMember,
  CategoryRole,
} from './entities/category.entity';

interface WorkspacePermission {
  workspaceId: number;
  visibility: 'PRIVATE' | 'PUBLIC';
  isMember: boolean;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  canView: boolean;
  canContribute: boolean;
  canAdmin: boolean;
}

interface WorkspaceResponse {
  id: number;
  name: string;
}

export interface CategoryPermission {
  categoryId: number;
  workspaceId: number;
  workspaceName: string;
  isWorkspaceMember: boolean;
  workspaceRole: WorkspacePermission['role'];
  categoryRole: CategoryRole | null;
  projectRole: CategoryRole | null;
  isCategoryMember: boolean;
  isProjectMember: boolean;
  isAuthor: boolean;
  canView: boolean;
  canContribute: boolean;
  canAdmin: boolean;
  canDelete: boolean;
}

export interface CategoryResponse {
  id: number;
  workspace_id: number;
  workspace_name: string;
  author_user_id: number;
  owner_user_id: number;
  name: string;
  description: string;
  archived_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  permissions: CategoryPermission | null;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(CategoryMember) private readonly membersRepo: Repository<CategoryMember>,
    @InjectRepository(CategoryInvitation) private readonly invitationsRepo: Repository<CategoryInvitation>,
    private readonly config: ConfigService,
    private readonly events: DomainEventPublisher,
  ) {}

  async list(user: { userId: number; token: string }, query: ListCategoriesQueryDto) {
    const rows = await this.categories.find({
      where: query.workspace_id ? { workspace_id: query.workspace_id, deleted_at: IsNull() } : { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
    });
    const visible: CategoryResponse[] = [];
    for (const category of rows) {
      const permission = await this.resolvePermission(user, category);
      const isArchivedHidden = category.archived_at && !this.canSeeArchived(permission);
      if (permission.canView && !isArchivedHidden && (!category.archived_at || query.include_archived)) {
        visible.push(this.toResponse(category, permission));
      }
    }
    return visible;
  }

  async create(user: { userId: number; token: string }, dto: CreateCategoryDto) {
    const workspace = await this.workspace(user, dto.workspace_id);
    const workspacePermission = await this.workspacePermission(user, dto.workspace_id);
    if (!workspacePermission.isMember) throw new ForbiddenException('Workspace membership required.');

    const category = await this.categories.save(this.categories.create({
      workspace_id: dto.workspace_id,
      workspace_name_snapshot: workspace.name,
      author_user_id: user.userId,
      owner_user_id: user.userId,
      name: dto.name,
      description: dto.description ?? '',
      archived_at: null,
      archived_by_user_id: null,
      deleted_at: null,
      deleted_by_user_id: null,
    }));
    await this.upsertMember(category.id, user.userId, CategoryRole.CATEGORY_OWNER, user.userId);
    await this.publish('category.created', category, user.userId);
    return this.get(user, category.id);
  }

  async ensureDefaultCategory(internalKey: string | undefined, body: { workspace_id: number; author_user_id: number; name?: string }) {
    this.validateInternalKey(internalKey);
    if (!Number.isInteger(body.workspace_id) || body.workspace_id <= 0) throw new BadRequestException('workspace_id is required.');
    if (!Number.isInteger(body.author_user_id) || body.author_user_id <= 0) throw new BadRequestException('author_user_id is required.');
    const name = body.name ?? 'Default Category';
    let category = await this.categories.findOne({
      where: {
        workspace_id: body.workspace_id,
        name,
        author_user_id: body.author_user_id,
        deleted_at: IsNull(),
      },
    });
    if (!category) {
      category = await this.categories.save(this.categories.create({
        workspace_id: body.workspace_id,
        workspace_name_snapshot: `Workspace ${body.workspace_id}`,
        author_user_id: body.author_user_id,
        owner_user_id: body.author_user_id,
        name,
        description: 'Default category for migrated workspace tasks.',
        archived_at: null,
        archived_by_user_id: null,
        deleted_at: null,
        deleted_by_user_id: null,
      }));
      await this.upsertMember(category.id, body.author_user_id, CategoryRole.CATEGORY_OWNER, body.author_user_id);
      await this.publish('category.created', category, body.author_user_id);
    }
    return this.toResponse(category, null);
  }

  async searchSnapshots(internalKey: string | undefined, page: number, size: number) {
    this.validateInternalKey(internalKey);
    const safePage = Math.max(Number.isFinite(page) ? page : 0, 0);
    const safeSize = Math.min(Math.max(Number.isFinite(size) ? size : 200, 1), 200);
    const rows = await this.categories.find({
      where: { deleted_at: IsNull() },
      order: { id: 'ASC' },
      skip: safePage * safeSize,
      take: safeSize,
    });
    return {
      items: rows.map((category) => this.searchableCategoryDocument(category)),
      hasNext: rows.length === safeSize,
    };
  }

  async get(user: { userId: number; token: string }, id: number) {
    const category = await this.visibleCategory(user, id);
    const permission = await this.resolvePermission(user, category);
    return this.toResponse(category, permission);
  }

  async update(user: { userId: number; token: string }, id: number, dto: UpdateCategoryDto) {
    const category = await this.visibleCategory(user, id);
    if (dto.workspace_id !== undefined && dto.workspace_id !== category.workspace_id) {
      throw new BadRequestException('Category workspace cannot be changed.');
    }
    const permission = await this.requireAdmin(user, category);
    if (category.archived_at) throw new ConflictException('Category is archived.');
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    await this.categories.save(category);
    await this.publish('category.updated', category, user.userId);
    return this.toResponse(category, permission);
  }

  async archive(user: { userId: number; token: string }, id: number) {
    const category = await this.visibleCategory(user, id);
    const permission = await this.requireDeletePermission(user, category);
    category.archived_at = category.archived_at ?? new Date();
    category.archived_by_user_id = user.userId;
    await this.categories.save(category);
    await this.publish('category.archived', category, user.userId);
    return this.toResponse(category, permission);
  }

  async remove(user: { userId: number; token: string }, id: number) {
    const category = await this.visibleCategory(user, id);
    await this.requireDeletePermission(user, category);
    category.deleted_at = category.deleted_at ?? new Date();
    category.deleted_by_user_id = user.userId;
    await this.categories.save(category);
    await this.publish('category.deleted', category, user.userId);
  }

  async permissions(user: { userId: number; token: string }, id: number) {
    const category = await this.categoryOr404(id);
    const permission = await this.resolvePermission(user, category);
    if (!permission.canView) throw new NotFoundException('Category not found');
    return permission;
  }

  async members(user: { userId: number; token: string }, id: number) {
    const category = await this.visibleCategory(user, id);
    await this.requireAdmin(user, category);
    return this.membersRepo.find({ where: { category_id: id, removed_at: IsNull() }, order: { created_at: 'ASC' } });
  }

  async changeRole(user: { userId: number; token: string }, id: number, targetUserId: number, dto: ChangeCategoryRoleDto) {
    const category = await this.visibleCategory(user, id);
    await this.requireAdmin(user, category);
    const member = await this.membersRepo.findOne({ where: { category_id: id, user_id: targetUserId, removed_at: IsNull() } });
    if (!member) throw new NotFoundException('Category member not found');
    member.role = dto.role;
    await this.membersRepo.save(member);
    await this.publish('category.member_role_changed', category, user.userId, { targetUserId, role: dto.role });
    return member;
  }

  async removeMember(user: { userId: number; token: string }, id: number, targetUserId: number) {
    const category = await this.visibleCategory(user, id);
    await this.requireAdmin(user, category);
    const member = await this.membersRepo.findOne({ where: { category_id: id, user_id: targetUserId, removed_at: IsNull() } });
    if (!member) throw new NotFoundException('Category member not found');
    member.removed_at = new Date();
    member.removed_by_user_id = user.userId;
    await this.membersRepo.save(member);
  }

  async invitations(user: { userId: number; token: string }, id: number) {
    const category = await this.visibleCategory(user, id);
    await this.requireAdmin(user, category);
    return this.invitationsRepo.find({ where: { category_id: id }, order: { created_at: 'DESC' } });
  }

  async invite(user: { userId: number; token: string }, id: number, dto: InviteCategoryMemberDto) {
    const category = await this.visibleCategory(user, id);
    await this.requireAdmin(user, category);
    if (dto.role === CategoryRole.CATEGORY_OWNER) throw new BadRequestException('Transfer ownership instead of inviting as owner.');
    const token = `${randomUUID()}-${randomUUID()}`;
    const invitation = await this.invitationsRepo.save(this.invitationsRepo.create({
      category_id: id,
      invited_email: dto.email.toLowerCase(),
      invited_user_id: null,
      role: dto.role,
      token_hash: this.hash(token),
      status: CategoryInvitationStatus.PENDING,
      created_by_user_id: user.userId,
      expires_at: new Date(Date.now() + this.invitationTtlHours() * 60 * 60 * 1000),
      responded_at: null,
    }));
    await this.publish('category.invited', category, user.userId, {
      invitationId: invitation.id,
      invitedEmail: invitation.invited_email,
      role: invitation.role,
    });
    return { ...invitation, token };
  }

  async acceptInvitation(user: { userId: number; token: string }, token: string) {
    const invitation = await this.pendingInvitation(token);
    const profileEmail = await this.currentProfileEmail(user);
    if (profileEmail.toLowerCase() !== invitation.invited_email) {
      throw new ForbiddenException('Invitation email does not match the current user.');
    }
    await this.upsertMember(invitation.category_id, user.userId, invitation.role, invitation.created_by_user_id);
    invitation.invited_user_id = user.userId;
    invitation.status = CategoryInvitationStatus.ACCEPTED;
    invitation.responded_at = new Date();
    await this.invitationsRepo.save(invitation);
    return invitation;
  }

  async rejectInvitation(user: { userId: number; token: string }, token: string) {
    const invitation = await this.pendingInvitation(token);
    const profileEmail = await this.currentProfileEmail(user);
    if (profileEmail.toLowerCase() !== invitation.invited_email) {
      throw new ForbiddenException('Invitation email does not match the current user.');
    }
    invitation.invited_user_id = user.userId;
    invitation.status = CategoryInvitationStatus.REJECTED;
    invitation.responded_at = new Date();
    return this.invitationsRepo.save(invitation);
  }

  private async visibleCategory(user: { userId: number; token: string }, id: number): Promise<Category> {
    const category = await this.categoryOr404(id);
    const permission = await this.resolvePermission(user, category);
    if (!permission.canView) throw new NotFoundException('Category not found');
    if ((category.archived_at || category.deleted_at) && !this.canSeeArchived(permission)) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private async categoryOr404(id: number): Promise<Category> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async resolvePermission(user: { userId: number; token: string }, category: Category): Promise<CategoryPermission> {
    const [workspacePermission, member] = await Promise.all([
      this.workspacePermissionOrNull(user, category.workspace_id),
      this.membersRepo.findOne({ where: { category_id: category.id, user_id: user.userId, removed_at: IsNull() } }),
    ]);
    const workspaceRole = workspacePermission?.role ?? null;
    const categoryRole = member?.role ?? this.derivedCategoryRole(workspaceRole);
    const isAdmin = workspacePermission?.canAdmin === true || categoryRole === CategoryRole.CATEGORY_OWNER || categoryRole === CategoryRole.CATEGORY_ADMIN;
    const canContribute = isAdmin || categoryRole === CategoryRole.CONTRIBUTOR;
    const isAuthor = category.author_user_id === user.userId;
    const canView = workspacePermission?.canView === true || Boolean(member);
    return {
      categoryId: category.id,
      workspaceId: category.workspace_id,
      workspaceName: category.workspace_name_snapshot,
      isWorkspaceMember: workspacePermission?.isMember === true,
      workspaceRole,
      categoryRole,
      projectRole: categoryRole,
      isCategoryMember: Boolean(member),
      isProjectMember: Boolean(member),
      isAuthor,
      canView,
      canContribute,
      canAdmin: isAdmin,
      canDelete: isAuthor || isAdmin,
    };
  }

  private derivedCategoryRole(role: WorkspacePermission['role']): CategoryRole | null {
    if (role === 'OWNER') return CategoryRole.CATEGORY_OWNER;
    if (role === 'ADMIN') return CategoryRole.CATEGORY_ADMIN;
    if (role === 'MEMBER') return CategoryRole.CONTRIBUTOR;
    if (role === 'VIEWER') return CategoryRole.VIEWER;
    return null;
  }

  private async requireAdmin(user: { userId: number; token: string }, category: Category) {
    const permission = await this.resolvePermission(user, category);
    if (!permission.canAdmin) throw new ForbiddenException('Category admin role required.');
    return permission;
  }

  private async requireDeletePermission(user: { userId: number; token: string }, category: Category) {
    const permission = await this.resolvePermission(user, category);
    if (!permission.canDelete) throw new ForbiddenException('Only the author or admin can delete this resource.');
    return permission;
  }

  private canSeeArchived(permission: CategoryPermission): boolean {
    return permission.isAuthor || permission.canAdmin;
  }

  private async upsertMember(categoryId: number, userId: number, role: CategoryRole, actorUserId: number) {
    let member = await this.membersRepo.findOne({ where: { category_id: categoryId, user_id: userId } });
    if (!member) {
      member = this.membersRepo.create({ category_id: categoryId, user_id: userId, role, added_by_user_id: actorUserId, removed_at: null, removed_by_user_id: null });
    } else {
      member.role = role;
      member.removed_at = null;
      member.removed_by_user_id = null;
    }
    return this.membersRepo.save(member);
  }

  private async workspace(user: { token: string }, workspaceId: number): Promise<WorkspaceResponse> {
    const response = await fetch(`${this.workspaceBaseUrl()}/api/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (response.status === 404) throw new NotFoundException('Workspace not found');
    if (!response.ok) throw new ForbiddenException('Workspace access check failed.');
    return (await response.json()) as WorkspaceResponse;
  }

  private async workspacePermission(user: { token: string }, workspaceId: number): Promise<WorkspacePermission> {
    const response = await fetch(`${this.workspaceBaseUrl()}/api/workspaces/${workspaceId}/permissions/me`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (response.status === 404) throw new NotFoundException('Workspace not found');
    if (response.status === 401 || response.status === 403) throw new ForbiddenException('Workspace access denied.');
    if (!response.ok) throw new ForbiddenException('Workspace access check failed.');
    return (await response.json()) as WorkspacePermission;
  }

  private async workspacePermissionOrNull(user: { token: string }, workspaceId: number): Promise<WorkspacePermission | null> {
    try {
      return await this.workspacePermission(user, workspaceId);
    } catch {
      return null;
    }
  }

  private async currentProfileEmail(user: { token: string }): Promise<string> {
    const response = await fetch(`${this.userBaseUrl()}/api/profiles/`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!response.ok) throw new ForbiddenException('Could not verify current profile email.');
    const profiles = (await response.json()) as Array<{ email?: string }>;
    const email = profiles[0]?.email;
    if (!email) throw new ForbiddenException('Current profile email is missing.');
    return email;
  }

  private async pendingInvitation(token: string): Promise<CategoryInvitation> {
    const invitation = await this.invitationsRepo.findOne({ where: { token_hash: this.hash(token) } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== CategoryInvitationStatus.PENDING) throw new ConflictException('Invitation is not pending');
    if (invitation.expires_at.getTime() < Date.now()) {
      invitation.status = CategoryInvitationStatus.EXPIRED;
      await this.invitationsRepo.save(invitation);
      throw new ConflictException('Invitation is expired');
    }
    return invitation;
  }

  private toResponse(category: Category, permission: CategoryPermission | null): CategoryResponse {
    return {
      id: category.id,
      workspace_id: category.workspace_id,
      workspace_name: category.workspace_name_snapshot,
      author_user_id: category.author_user_id,
      owner_user_id: category.owner_user_id,
      name: category.name,
      description: category.description,
      archived_at: category.archived_at,
      deleted_at: category.deleted_at,
      created_at: category.created_at,
      updated_at: category.updated_at,
      permissions: permission,
    };
  }

  private async publish(eventType: string, category: Category, actorUserId: number, extra: Record<string, unknown> = {}) {
    await this.events.publish({
      eventType,
      actorUserId,
      resource: { type: 'category', id: category.id },
      data: {
        categoryId: category.id,
        workspaceId: category.workspace_id,
        authorUserId: category.author_user_id,
        ownerUserId: category.owner_user_id,
        name: category.name,
        description: category.description,
        archivedAt: category.archived_at,
        deletedAt: category.deleted_at,
        updatedAt: category.updated_at,
        ...extra,
      },
    });
  }

  private searchableCategoryDocument(category: Category): Record<string, unknown> {
    return {
      type: 'category',
      resourceId: category.id,
      categoryId: category.id,
      workspaceId: category.workspace_id,
      authorUserId: category.author_user_id,
      ownerUserId: category.owner_user_id,
      title: category.name,
      name: category.name,
      description: category.description,
      archivedAt: category.archived_at,
      deletedAt: category.deleted_at,
      updatedAt: category.updated_at,
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private invitationTtlHours(): number {
    return parseInt(this.config.get<string>('CATEGORY_INVITATION_TTL_HOURS', '168'), 10);
  }

  private validateInternalKey(internalKey: string | undefined) {
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected || internalKey !== expected) throw new UnauthorizedException('Invalid internal key');
  }

  private workspaceBaseUrl(): string {
    return this.config.get<string>('WORKSPACE_SERVICE_BASE_URL', 'http://workspace-service:8000').replace(/\/+$/, '');
  }

  private userBaseUrl(): string {
    return this.config.get<string>('USER_SERVICE_BASE_URL', 'http://user-service:8000').replace(/\/+$/, '');
  }
}
