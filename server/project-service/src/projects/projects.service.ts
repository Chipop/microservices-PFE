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
  ChangeProjectRoleDto,
  CreateProjectDto,
  InviteProjectMemberDto,
  ListProjectsQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';
import {
  Project,
  ProjectInvitation,
  ProjectInvitationStatus,
  ProjectMember,
  ProjectRole,
} from './entities/project.entity';

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

export interface ProjectPermission {
  projectId: number;
  workspaceId: number;
  workspaceName: string;
  isWorkspaceMember: boolean;
  workspaceRole: WorkspacePermission['role'];
  projectRole: ProjectRole | null;
  isProjectMember: boolean;
  isAuthor: boolean;
  canView: boolean;
  canContribute: boolean;
  canAdmin: boolean;
  canDelete: boolean;
}

export interface ProjectResponse {
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
  permissions: ProjectPermission | null;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly membersRepo: Repository<ProjectMember>,
    @InjectRepository(ProjectInvitation) private readonly invitationsRepo: Repository<ProjectInvitation>,
    private readonly config: ConfigService,
    private readonly events: DomainEventPublisher,
  ) {}

  async list(user: { userId: number; token: string }, query: ListProjectsQueryDto) {
    const rows = await this.projects.find({
      where: query.workspace_id ? { workspace_id: query.workspace_id, deleted_at: IsNull() } : { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
    });
    const visible: ProjectResponse[] = [];
    for (const project of rows) {
      const permission = await this.resolvePermission(user, project);
      const isArchivedHidden = project.archived_at && !this.canSeeArchived(permission);
      if (permission.canView && !isArchivedHidden && (!project.archived_at || query.include_archived)) {
        visible.push(this.toResponse(project, permission));
      }
    }
    return visible;
  }

  async create(user: { userId: number; token: string }, dto: CreateProjectDto) {
    const workspace = await this.workspace(user, dto.workspace_id);
    const workspacePermission = await this.workspacePermission(user, dto.workspace_id);
    if (!workspacePermission.isMember) throw new ForbiddenException('Workspace membership required.');

    const project = await this.projects.save(this.projects.create({
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
    await this.upsertMember(project.id, user.userId, ProjectRole.PROJECT_OWNER, user.userId);
    await this.publish('project.created', project, user.userId);
    return this.get(user, project.id);
  }

  async ensureDefaultProject(internalKey: string | undefined, body: { workspace_id: number; author_user_id: number; name?: string }) {
    this.validateInternalKey(internalKey);
    if (!Number.isInteger(body.workspace_id) || body.workspace_id <= 0) throw new BadRequestException('workspace_id is required.');
    if (!Number.isInteger(body.author_user_id) || body.author_user_id <= 0) throw new BadRequestException('author_user_id is required.');
    const name = body.name ?? 'Default Project';
    let project = await this.projects.findOne({
      where: {
        workspace_id: body.workspace_id,
        name,
        author_user_id: body.author_user_id,
        deleted_at: IsNull(),
      },
    });
    if (!project) {
      project = await this.projects.save(this.projects.create({
        workspace_id: body.workspace_id,
        workspace_name_snapshot: `Workspace ${body.workspace_id}`,
        author_user_id: body.author_user_id,
        owner_user_id: body.author_user_id,
        name,
        description: 'Default project for migrated workspace tasks.',
        archived_at: null,
        archived_by_user_id: null,
        deleted_at: null,
        deleted_by_user_id: null,
      }));
      await this.upsertMember(project.id, body.author_user_id, ProjectRole.PROJECT_OWNER, body.author_user_id);
      await this.publish('project.created', project, body.author_user_id);
    }
    return this.toResponse(project, null);
  }

  async searchSnapshots(internalKey: string | undefined, page: number, size: number) {
    this.validateInternalKey(internalKey);
    const safePage = Math.max(Number.isFinite(page) ? page : 0, 0);
    const safeSize = Math.min(Math.max(Number.isFinite(size) ? size : 200, 1), 200);
    const rows = await this.projects.find({
      where: { deleted_at: IsNull() },
      order: { id: 'ASC' },
      skip: safePage * safeSize,
      take: safeSize,
    });
    return {
      items: rows.map((project) => this.searchableProjectDocument(project)),
      hasNext: rows.length === safeSize,
    };
  }

  async get(user: { userId: number; token: string }, id: number) {
    const project = await this.visibleProject(user, id);
    const permission = await this.resolvePermission(user, project);
    return this.toResponse(project, permission);
  }

  async update(user: { userId: number; token: string }, id: number, dto: UpdateProjectDto) {
    const project = await this.visibleProject(user, id);
    if (dto.workspace_id !== undefined && dto.workspace_id !== project.workspace_id) {
      throw new BadRequestException('Project workspace cannot be changed.');
    }
    const permission = await this.requireAdmin(user, project);
    if (project.archived_at) throw new ConflictException('Project is archived.');
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description;
    await this.projects.save(project);
    await this.publish('project.updated', project, user.userId);
    return this.toResponse(project, permission);
  }

  async archive(user: { userId: number; token: string }, id: number) {
    const project = await this.visibleProject(user, id);
    const permission = await this.requireDeletePermission(user, project);
    project.archived_at = project.archived_at ?? new Date();
    project.archived_by_user_id = user.userId;
    await this.projects.save(project);
    await this.publish('project.archived', project, user.userId);
    return this.toResponse(project, permission);
  }

  async remove(user: { userId: number; token: string }, id: number) {
    const project = await this.visibleProject(user, id);
    await this.requireDeletePermission(user, project);
    project.deleted_at = project.deleted_at ?? new Date();
    project.deleted_by_user_id = user.userId;
    await this.projects.save(project);
    await this.publish('project.deleted', project, user.userId);
  }

  async permissions(user: { userId: number; token: string }, id: number) {
    const project = await this.projectOr404(id);
    const permission = await this.resolvePermission(user, project);
    if (!permission.canView) throw new NotFoundException('Project not found');
    return permission;
  }

  async members(user: { userId: number; token: string }, id: number) {
    const project = await this.visibleProject(user, id);
    await this.requireAdmin(user, project);
    return this.membersRepo.find({ where: { project_id: id, removed_at: IsNull() }, order: { created_at: 'ASC' } });
  }

  async changeRole(user: { userId: number; token: string }, id: number, targetUserId: number, dto: ChangeProjectRoleDto) {
    const project = await this.visibleProject(user, id);
    await this.requireAdmin(user, project);
    const member = await this.membersRepo.findOne({ where: { project_id: id, user_id: targetUserId, removed_at: IsNull() } });
    if (!member) throw new NotFoundException('Project member not found');
    member.role = dto.role;
    await this.membersRepo.save(member);
    await this.publish('project.member_role_changed', project, user.userId, { targetUserId, role: dto.role });
    return member;
  }

  async removeMember(user: { userId: number; token: string }, id: number, targetUserId: number) {
    const project = await this.visibleProject(user, id);
    await this.requireAdmin(user, project);
    const member = await this.membersRepo.findOne({ where: { project_id: id, user_id: targetUserId, removed_at: IsNull() } });
    if (!member) throw new NotFoundException('Project member not found');
    member.removed_at = new Date();
    member.removed_by_user_id = user.userId;
    await this.membersRepo.save(member);
  }

  async invitations(user: { userId: number; token: string }, id: number) {
    const project = await this.visibleProject(user, id);
    await this.requireAdmin(user, project);
    return this.invitationsRepo.find({ where: { project_id: id }, order: { created_at: 'DESC' } });
  }

  async invite(user: { userId: number; token: string }, id: number, dto: InviteProjectMemberDto) {
    const project = await this.visibleProject(user, id);
    await this.requireAdmin(user, project);
    if (dto.role === ProjectRole.PROJECT_OWNER) throw new BadRequestException('Transfer ownership instead of inviting as owner.');
    const token = `${randomUUID()}-${randomUUID()}`;
    const invitation = await this.invitationsRepo.save(this.invitationsRepo.create({
      project_id: id,
      invited_email: dto.email.toLowerCase(),
      invited_user_id: null,
      role: dto.role,
      token_hash: this.hash(token),
      status: ProjectInvitationStatus.PENDING,
      created_by_user_id: user.userId,
      expires_at: new Date(Date.now() + this.invitationTtlHours() * 60 * 60 * 1000),
      responded_at: null,
    }));
    await this.publish('project.invited', project, user.userId, {
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
    await this.upsertMember(invitation.project_id, user.userId, invitation.role, invitation.created_by_user_id);
    invitation.invited_user_id = user.userId;
    invitation.status = ProjectInvitationStatus.ACCEPTED;
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
    invitation.status = ProjectInvitationStatus.REJECTED;
    invitation.responded_at = new Date();
    return this.invitationsRepo.save(invitation);
  }

  private async visibleProject(user: { userId: number; token: string }, id: number): Promise<Project> {
    const project = await this.projectOr404(id);
    const permission = await this.resolvePermission(user, project);
    if (!permission.canView) throw new NotFoundException('Project not found');
    if ((project.archived_at || project.deleted_at) && !this.canSeeArchived(permission)) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async projectOr404(id: number): Promise<Project> {
    const project = await this.projects.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async resolvePermission(user: { userId: number; token: string }, project: Project): Promise<ProjectPermission> {
    const [workspacePermission, member] = await Promise.all([
      this.workspacePermissionOrNull(user, project.workspace_id),
      this.membersRepo.findOne({ where: { project_id: project.id, user_id: user.userId, removed_at: IsNull() } }),
    ]);
    const workspaceRole = workspacePermission?.role ?? null;
    const projectRole = member?.role ?? this.derivedProjectRole(workspaceRole);
    const isAdmin = workspacePermission?.canAdmin === true || projectRole === ProjectRole.PROJECT_OWNER || projectRole === ProjectRole.PROJECT_ADMIN;
    const canContribute = isAdmin || projectRole === ProjectRole.CONTRIBUTOR;
    const isAuthor = project.author_user_id === user.userId;
    const canView = workspacePermission?.canView === true || Boolean(member);
    return {
      projectId: project.id,
      workspaceId: project.workspace_id,
      workspaceName: project.workspace_name_snapshot,
      isWorkspaceMember: workspacePermission?.isMember === true,
      workspaceRole,
      projectRole,
      isProjectMember: Boolean(member),
      isAuthor,
      canView,
      canContribute,
      canAdmin: isAdmin,
      canDelete: isAuthor || isAdmin,
    };
  }

  private derivedProjectRole(role: WorkspacePermission['role']): ProjectRole | null {
    if (role === 'OWNER') return ProjectRole.PROJECT_OWNER;
    if (role === 'ADMIN') return ProjectRole.PROJECT_ADMIN;
    if (role === 'MEMBER') return ProjectRole.CONTRIBUTOR;
    if (role === 'VIEWER') return ProjectRole.VIEWER;
    return null;
  }

  private async requireAdmin(user: { userId: number; token: string }, project: Project) {
    const permission = await this.resolvePermission(user, project);
    if (!permission.canAdmin) throw new ForbiddenException('Project admin role required.');
    return permission;
  }

  private async requireDeletePermission(user: { userId: number; token: string }, project: Project) {
    const permission = await this.resolvePermission(user, project);
    if (!permission.canDelete) throw new ForbiddenException('Only the author or admin can delete this resource.');
    return permission;
  }

  private canSeeArchived(permission: ProjectPermission): boolean {
    return permission.isAuthor || permission.canAdmin;
  }

  private async upsertMember(projectId: number, userId: number, role: ProjectRole, actorUserId: number) {
    let member = await this.membersRepo.findOne({ where: { project_id: projectId, user_id: userId } });
    if (!member) {
      member = this.membersRepo.create({ project_id: projectId, user_id: userId, role, added_by_user_id: actorUserId, removed_at: null, removed_by_user_id: null });
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

  private async pendingInvitation(token: string): Promise<ProjectInvitation> {
    const invitation = await this.invitationsRepo.findOne({ where: { token_hash: this.hash(token) } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== ProjectInvitationStatus.PENDING) throw new ConflictException('Invitation is not pending');
    if (invitation.expires_at.getTime() < Date.now()) {
      invitation.status = ProjectInvitationStatus.EXPIRED;
      await this.invitationsRepo.save(invitation);
      throw new ConflictException('Invitation is expired');
    }
    return invitation;
  }

  private toResponse(project: Project, permission: ProjectPermission | null): ProjectResponse {
    return {
      id: project.id,
      workspace_id: project.workspace_id,
      workspace_name: project.workspace_name_snapshot,
      author_user_id: project.author_user_id,
      owner_user_id: project.owner_user_id,
      name: project.name,
      description: project.description,
      archived_at: project.archived_at,
      deleted_at: project.deleted_at,
      created_at: project.created_at,
      updated_at: project.updated_at,
      permissions: permission,
    };
  }

  private async publish(eventType: string, project: Project, actorUserId: number, extra: Record<string, unknown> = {}) {
    await this.events.publish({
      eventType,
      actorUserId,
      resource: { type: 'project', id: project.id },
      data: {
        projectId: project.id,
        workspaceId: project.workspace_id,
        authorUserId: project.author_user_id,
        ownerUserId: project.owner_user_id,
        name: project.name,
        description: project.description,
        archivedAt: project.archived_at,
        deletedAt: project.deleted_at,
        updatedAt: project.updated_at,
        ...extra,
      },
    });
  }

  private searchableProjectDocument(project: Project): Record<string, unknown> {
    return {
      type: 'project',
      resourceId: project.id,
      projectId: project.id,
      workspaceId: project.workspace_id,
      authorUserId: project.author_user_id,
      ownerUserId: project.owner_user_id,
      title: project.name,
      name: project.name,
      description: project.description,
      archivedAt: project.archived_at,
      deletedAt: project.deleted_at,
      updatedAt: project.updated_at,
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private invitationTtlHours(): number {
    return parseInt(this.config.get<string>('PROJECT_INVITATION_TTL_HOURS', '168'), 10);
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
