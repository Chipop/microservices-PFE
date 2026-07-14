import type {
  AttachmentDto,
  CommentDto,
  NotificationDto,
  ProfileDto,
  CategoryDto,
  TaskActivityDto,
  TaskDto,
  TaskStatusDto,
  WorkspaceDto,
} from './api'
import type { Comment, Notification, Priority, Category, Task, TaskActivity, TaskStatus, User, Workspace } from '@/types'

export function initials(nameOrEmail: string) {
  const parts = nameOrEmail.trim().split(/[\s._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
}

export function profileToUser(profile: ProfileDto | null, fallbackId: number | null): User {
  const username = profile?.username ?? (fallbackId ? `user-${fallbackId}` : 'user')
  return {
    id: String(profile?.auth_user_id ?? fallbackId ?? ''),
    name: username,
    username,
    email: profile?.email ?? '',
    initials: initials(username),
    avatar: profile?.profile_picture_url ?? undefined,
  }
}

export function workspaceToView(dto: WorkspaceDto): Workspace {
  return {
    id: String(dto.id),
    name: dto.name,
    key: dto.name.slice(0, 2).toUpperCase(),
    description: dto.description ?? '',
    memberCount: 1,
    role: dto.currentUserRole,
    workspaceType: dto.workspaceType,
    visibility: dto.visibility,
    publicContributionsEnabled: dto.publicContributionsEnabled,
  }
}

export function categoryToView(dto: CategoryDto, lead: User): Category {
  return {
    id: String(dto.id),
    workspaceId: String(dto.workspace_id),
    key: categoryKey(dto.name, dto.id),
    name: dto.name,
    description: dto.description ?? '',
    color: colorFromId(dto.id),
    lead,
    favorite: false,
    updatedAt: formatDate(dto.updated_at),
    taskCount: 0,
    completedCount: 0,
  }
}

export function taskToView(dto: TaskDto, currentUser: User): Task {
  const assignee = dto.assignments[0]?.assignee_user_id
  return {
    id: String(dto.id),
    key: taskKey(dto.category_id, dto.id),
    workspaceId: String(dto.workspace_id ?? ''),
    categoryId: String(dto.category_id ?? ''),
    title: dto.title,
    description: dto.description ?? '',
    status: statusToView(dto),
    priority: priorityToView(dto.priority),
    assignee: assignee ? userStub(assignee) : undefined,
    reporter: dto.author_user_id === Number(currentUser.id) ? currentUser : userStub(dto.author_user_id),
    dueDate: dto.due_at?.slice(0, 10),
    tags: dto.tags.map(tag => tag.name),
    subtasks: dto.subtasks.map(subtask => ({ id: String(subtask.id), title: subtask.title, done: subtask.done })),
    dependencies: dto.dependencies.map(dependency => String(dependency.depends_on_task_id)),
    reminders: dto.reminders.map(reminder => reminder.remind_at),
    attachments: [],
    comments: [],
    activities: [],
    updatedAt: formatDate(dto.updated_at),
    createdAt: formatDate(dto.created_at),
  }
}

export function commentToView(dto: CommentDto, currentUser: User): Comment {
  return {
    id: String(dto.id),
    author: dto.author_user_id === Number(currentUser.id) ? currentUser : userStub(dto.author_user_id),
    body: dto.body,
    createdAt: formatDate(dto.created_at),
  }
}

export function attachmentToView(dto: AttachmentDto) {
  return {
    id: String(dto.id),
    name: dto.originalFilename,
    size: formatBytes(dto.sizeBytes),
  }
}

export function notificationToView(dto: NotificationDto): Notification {
  return {
    id: String(dto.id),
    type: dto.type,
    title: dto.title,
    message: dto.message,
    isRead: dto.isRead,
    createdAt: formatDate(dto.createdAt),
    relatedResourceType: dto.relatedResourceType ?? undefined,
    relatedResourceId: dto.relatedResourceId === null ? undefined : String(dto.relatedResourceId),
  }
}

export function activityToView(dto: TaskActivityDto, currentUser: User): TaskActivity {
  const actor = dto.actor_user_id === Number(currentUser.id) ? currentUser : userStub(dto.actor_user_id)
  return {
    id: String(dto.id),
    actor,
    type: dto.type,
    fromValue: dto.from_value ?? undefined,
    toValue: dto.to_value ?? undefined,
    message: dto.message,
    createdAt: formatDate(dto.created_at),
  }
}

export function priorityToApi(priority?: Priority): TaskDto['priority'] {
  if (priority === 'Highest') return 'urgent'
  if (priority === 'High') return 'high'
  if (priority === 'Low') return 'low'
  return 'normal'
}

export function priorityToView(priority: TaskDto['priority']): Priority {
  if (priority === 'urgent') return 'Highest'
  if (priority === 'high') return 'High'
  if (priority === 'low') return 'Low'
  return 'Medium'
}

export function statusToApi(status?: TaskStatus): TaskStatusDto | undefined {
  if (status === 'Backlog') return 'backlog'
  if (status === 'To do') return 'todo'
  if (status === 'In progress') return 'in_progress'
  if (status === 'Review') return 'review'
  if (status === 'Done') return 'done'
  return undefined
}

function statusToView(dto: TaskDto): TaskStatus {
  if (dto.status === 'backlog') return 'Backlog'
  if (dto.status === 'todo') return 'To do'
  if (dto.status === 'in_progress') return 'In progress'
  if (dto.status === 'review') return 'Review'
  if (dto.status === 'done') return 'Done'
  if (dto.status === 'archived') return 'Done'
  return 'To do'
}

function userStub(id: number): User {
  const name = `User ${id}`
  return { id: String(id), name, username: `user-${id}`, email: '', initials: initials(name) }
}

function categoryKey(name: string, id: number) {
  const letters = name.match(/[A-Za-z0-9]/g)?.join('').slice(0, 4).toUpperCase()
  return letters || `P${id}`
}

function taskKey(categoryId: number | null, id: number) {
  return `${categoryId ? `P${categoryId}` : 'TASK'}-${id}`
}

function colorFromId(id: number) {
  const colors = ['#00a9ad', '#f4b400', '#34424c', '#6a8d73', '#8a5a44', '#3f6c8f']
  return colors[id % colors.length]
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
