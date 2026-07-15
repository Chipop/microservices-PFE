import type {
  CreateTaskInput,
  Notification,
  Category,
  CategoryMember,
  Task,
  TaskPermissions,
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types'
import {
  attachmentsApi,
  commentsApi,
  notificationsApi,
  profilesApi,
  categoriesApi,
  tasksApi,
  workspacesApi,
} from '@/services/api'
import {
  activityToView,
  attachmentToView,
  notificationToView,
  priorityToApi,
  profileToUser,
  categoryToView,
  statusToApi,
  taskToView,
  workspaceToView,
} from '@/services/mappers'
import { useAuthStore } from '@/stores/auth'

const toNumberId = (id: string | number | undefined) => Number(String(id ?? '').replace(/^[a-z]+/i, ''))
const currentUser = () => useAuthStore().currentUser

export const workspaceRepository = {
  async list(): Promise<Workspace[]> {
    return (await workspacesApi.list()).map(workspaceToView)
  },
  async create(input: Pick<Workspace, 'name'> & Partial<Pick<Workspace, 'description' | 'visibility' | 'publicContributionsEnabled'>>): Promise<Workspace> {
    return workspaceToView(await workspacesApi.create({
      name: input.name,
      description: input.description,
      visibility: input.visibility,
      publicContributionsEnabled: input.publicContributionsEnabled,
    }))
  },
  async update(id: string, input: Partial<Pick<Workspace, 'name' | 'description' | 'visibility' | 'publicContributionsEnabled'>>): Promise<Workspace> {
    return workspaceToView(await workspacesApi.update(toNumberId(id), {
      name: input.name,
      description: input.description,
      visibility: input.visibility,
      publicContributionsEnabled: input.publicContributionsEnabled,
    }))
  },
  async archive(id: string): Promise<Workspace> {
    return workspaceToView(await workspacesApi.archive(toNumberId(id)))
  },
  async members(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await workspacesApi.members(toNumberId(workspaceId))
    const memberIds = response.members.map(member => member.userId)
    const profiles = memberIds.length ? await profilesApi.resolveByAuthIds(memberIds) : []
    const profilesByAuthId = new Map(profiles.map(profile => [profile.auth_user_id, profile]))
    return response.members.map(member => {
      const profile = profilesByAuthId.get(member.userId)
      const user = profile
        ? profileToUser(profile, member.userId)
        : userStub(member.userId)
      return { ...user, role: member.role }
    })
  },
  async inviteMember(workspaceId: string, email: string, role: WorkspaceRole) {
    return workspacesApi.inviteMember(toNumberId(workspaceId), { email, role })
  },
  async changeMemberRole(workspaceId: string, userId: string, role: Exclude<WorkspaceRole, 'OWNER'>): Promise<WorkspaceMember> {
    const member = await workspacesApi.changeMemberRole(toNumberId(workspaceId), toNumberId(userId), role)
    const profiles = await profilesApi.resolveByAuthIds([member.userId]).catch(() => [])
    const profile = profiles.find(row => row.auth_user_id === member.userId)
    const user = profile ? profileToUser(profile, member.userId) : userStub(member.userId)
    return { ...user, role: member.role }
  },
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await workspacesApi.removeMember(toNumberId(workspaceId), toNumberId(userId))
  },
}

export const categoryRepository = {
  async list(workspaceId?: string): Promise<Category[]> {
    return (await categoriesApi.list(workspaceId ? toNumberId(workspaceId) : undefined)).map(category => categoryToView(category, currentUser()))
  },
  async get(id: string): Promise<Category | undefined> {
    return categoryToView(await categoriesApi.get(toNumberId(id)), currentUser())
  },
  async create(input: Partial<Category>): Promise<Category> {
    const workspaceId = toNumberId(input.workspaceId)
    const category = await categoriesApi.create({
      workspace_id: workspaceId,
      name: input.name ?? 'Untitled category',
      description: input.description ?? '',
    })
    return categoryToView(category, currentUser())
  },
  async members(categoryId: string): Promise<CategoryMember[]> {
    const members = await categoriesApi.members(toNumberId(categoryId))
    const memberIds = members.map(member => member.user_id)
    const profiles = memberIds.length ? await profilesApi.resolveByAuthIds(memberIds).catch(() => []) : []
    const profilesByAuthId = new Map(profiles.map(profile => [profile.auth_user_id, profile]))
    return members.map(member => {
      const profile = profilesByAuthId.get(member.user_id)
      const user = profile
        ? profileToUser(profile, member.user_id)
        : userStub(member.user_id)
      return {
        ...user,
        role: member.role,
        joinedAt: formatMemberDate(member.created_at),
      }
    })
  },
}

export const taskRepository = {
  async list(categoryId?: string, workspaceId?: string): Promise<Task[]> {
    const rows = await tasksApi.list({
      category_id: categoryId ? toNumberId(categoryId) : undefined,
      workspace_id: workspaceId && !categoryId ? toNumberId(workspaceId) : undefined,
    })
    return Promise.all(rows.map(async row => withPermissions(taskToView(row, currentUser()))))
  },
  async get(id: string): Promise<Task | undefined> {
    return withPermissions(taskToView(await tasksApi.get(toNumberId(id)), currentUser()))
  },
  async create(input: CreateTaskInput): Promise<Task> {
    const status = statusToApi(input.status)
    const taskIdInput = {
      category_id: toNumberId(input.categoryId),
      title: input.title ?? 'Untitled task',
      description: input.description ?? '',
      priority: priorityToApi(input.priority),
      due_at: input.dueDate || null,
      ...(status ? { status } : {}),
    }
    let task = taskToView(await tasksApi.create(taskIdInput), currentUser())
    const taskId = toNumberId(task.id)
    const assigneeUserId = toNumberId(input.assigneeUserId)
    const followUps: Promise<unknown>[] = []
    if (assigneeUserId) followUps.push(tasksApi.addAssignment(taskId, assigneeUserId))
    input.tags?.filter(Boolean).forEach(tag => followUps.push(tasksApi.addTag(taskId, tag)))
    input.subtaskTitles?.filter(Boolean).forEach((title, index) => followUps.push(tasksApi.createSubtask(taskId, title, index)))
    input.reminderDates?.filter(Boolean).forEach(reminder => followUps.push(tasksApi.createReminder(taskId, new Date(reminder).toISOString())))
    if (input.recurrence) followUps.push(tasksApi.upsertRecurrence(taskId, true, { preset: input.recurrence }))
    if (followUps.length) {
      await Promise.all(followUps)
      task = taskToView(await tasksApi.get(taskId), currentUser())
    }
    if (input.assignee) task.assignee = input.assignee
    return task
  },
  async update(id: string, changes: Partial<Task>): Promise<Task | undefined> {
    const statusPatch = changes.status !== undefined
      ? { status: statusToApi(changes.status) }
      : {}
    const task = await tasksApi.update(toNumberId(id), {
      ...(changes.title !== undefined ? { title: changes.title } : {}),
      ...(changes.description !== undefined ? { description: changes.description } : {}),
      ...(changes.priority !== undefined ? { priority: priorityToApi(changes.priority) } : {}),
      ...(changes.dueDate !== undefined ? { due_at: changes.dueDate || null } : {}),
      ...statusPatch,
    })
    return taskToView(task, currentUser())
  },
  async loadDetails(task: Task): Promise<Task> {
    const [comments, attachments, activities, permissions] = await Promise.all([
      commentsApi.list(toNumberId(task.id)).catch(() => []),
      attachmentsApi.listTask(toNumberId(task.id)).catch(() => []),
      tasksApi.activity(toNumberId(task.id)).catch(() => []),
      task.permissions ? Promise.resolve(task.permissions) : loadPermissions(task.id),
    ])
    return {
      ...task,
      comments: comments.map(comment => ({
        id: String(comment.id),
        author: comment.author_user_id === Number(currentUser().id) ? currentUser() : userStub(comment.author_user_id),
        body: comment.body,
        createdAt: comment.created_at,
      })),
      attachments: attachments.map(attachmentToView),
      activities: activities.map(activity => activityToView(activity, currentUser())),
      permissions,
    }
  },
  async createComment(taskId: string, body: string) {
    const comment = await commentsApi.create(toNumberId(taskId), body)
    return {
      id: String(comment.id),
      author: currentUser(),
      body: comment.body,
      createdAt: comment.created_at,
    }
  },
}

async function withPermissions(task: Task): Promise<Task> {
  return { ...task, permissions: await loadPermissions(task.id) }
}

async function loadPermissions(taskId: string): Promise<TaskPermissions | undefined> {
  try {
    const permissions = await tasksApi.permissions(toNumberId(taskId))
    return {
      canView: permissions.canView,
      canContribute: permissions.canContribute,
      canAdmin: permissions.canAdmin,
      canDelete: permissions.canDelete,
    }
  } catch {
    return undefined
  }
}

function userStub(id: number): User {
  const name = `User ${id}`
  return { id: String(id), name, username: `user-${id}`, email: '', initials: `U${id}` }
}

function formatMemberDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export const notificationRepository = {
  async list(): Promise<Notification[]> {
    const page = await notificationsApi.list()
    return page.content.map(notificationToView)
  },
}
