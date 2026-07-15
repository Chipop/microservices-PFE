const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:8080'

export const API_BASES = {
  auth: `${GATEWAY}/api/auth`,
  profiles: `${GATEWAY}/api/profiles`,
  workspaces: `${GATEWAY}/api/workspaces`,
  categories: `${GATEWAY}/api/categories`,
  comments: `${GATEWAY}/api/comments`,
  statistics: `${GATEWAY}/api/statistics`,
  tasks: `${GATEWAY}/api/tasks`,
  attachments: `${GATEWAY}/api/attachments`,
  notifications: `${GATEWAY}/api/notifications`,
  search: `${GATEWAY}/api/search`,
}

const ACCESS_KEY = 'flowforge_access'
const REFRESH_KEY = 'flowforge_refresh'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface Page<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

export interface TokenPair {
  access: string
  refresh: string
}

export interface TwoFactorRequired {
  detail: 'two_factor_required'
  two_factor_required: true
}

export interface PasswordResetRequestResponse {
  detail: string
  token?: string
}

export interface AuthSessionDto {
  id: number
  ip_address: string
  user_agent: string
  created_at: string
  expires_at: string
  revoked_at: string | null
  active: boolean
}

export interface ProfileDto {
  id: number
  auth_user_id: number
  username: string
  email: string
  profile_picture_url: string | null
  biography: string
  timezone: string
  language: string
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProfileSearchResultDto {
  auth_user_id: number
  username: string
  email: string
  profile_picture_url: string | null
}

export interface WorkspaceDto {
  id: number
  name: string
  description: string
  ownerUserId: number
  visibility: 'PRIVATE' | 'PUBLIC'
  publicContributionsEnabled: boolean
  workspaceType: 'PERSONAL' | 'TEAM'
  archivedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  canView: boolean
  canContribute: boolean
  canAdmin: boolean
}

export interface WorkspaceMemberDto {
  id: number
  userId: number
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: string
}

export interface WorkspaceInvitationDto {
  id: number
  workspaceId: number
  invitedEmail: string
  invitedUserId: number | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  expiresAt: string
  respondedAt: string | null
  createdAt: string
  token: string
}

export interface CategoryDto {
  id: number
  workspace_id: number
  workspace_name: string
  author_user_id: number
  owner_user_id: number
  name: string
  description: string
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type CategoryRoleDto = 'CATEGORY_OWNER' | 'CATEGORY_ADMIN' | 'CONTRIBUTOR' | 'VIEWER'

export interface CategoryMemberDto {
  id: number
  category_id: number
  user_id: number
  role: CategoryRoleDto
  added_by_user_id: number
  removed_at: string | null
  removed_by_user_id: number | null
  created_at: string
  updated_at: string
}

export type TaskStatusDto = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'archived'

export interface KanbanColumnDto {
  id: number
  name: string
  position?: number
}

export interface TaskDto {
  id: number
  category_id: number | null
  workspace_id: number | null
  author_user_id: number
  title: string
  description: string
  done: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_at: string | null
  completed_at: string | null
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  status: TaskStatusDto
  kanban_column: KanbanColumnDto | null
  assignments: Array<{ id: number; assignee_user_id: number; assigned_by_user_id: number }>
  tags: Array<{ id: number; name: string; color: string }>
  subtasks: Array<{ id: number; title: string; done: boolean; position: number }>
  dependencies: Array<{ id: number; depends_on_task_id: number }>
  reminders: Array<{ id: number; remind_at: string; status: string }>
}

export interface CommentDto {
  id: number
  task_id: number
  category_id: number | null
  workspace_id: number | null
  author_user_id: number
  body: string
  created_at: string
  updated_at: string
}

export interface TaskActivityDto {
  id: number
  task_id: number
  actor_user_id: number
  type: string
  from_value: string | null
  to_value: string | null
  message: string
  created_at: string
}

export interface TaskPermissionDto {
  taskId: number
  category_id: number | null
  workspace_id: number | null
  author_user_id: number
  canView: boolean
  canContribute: boolean
  canAdmin: boolean
  canDelete: boolean
}

export interface AttachmentDto {
  id: number
  targetType: string
  targetId: number
  originalFilename: string
  contentType: string
  sizeBytes: number
  uploadedByUserId: number
  createdAt: string
}

export interface NotificationDto {
  id: number
  recipientUserId: number
  type: string
  title: string
  message: string
  relatedResourceId: number | null
  relatedResourceType: string | null
  isRead: boolean
  createdAt: string
  readAt: string | null
}

export interface SearchResponseDto {
  query: string
  page: number
  size: number
  total: number
  results: Array<{
    type: string
    id: string
    title: string
    snippet: string
    score: number
    metadata: Record<string, unknown>
  }>
}

export interface StatisticsOverviewDto {
  totalTasks: number
  completedTasks: number
  completionRate: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  byPriority: Record<string, number>
  trends: Record<string, number>
}

interface RequestOptions {
  method?: string
  body?: unknown | FormData
  auth?: boolean
  headers?: Record<string, string>
}

export function decodeUserId(access = tokens.access): number | null {
  if (!access) return null
  try {
    const payload = JSON.parse(atob(access.split('.')[1] ?? '')) as { user_id?: string | number }
    const id = Number(payload.user_id)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

export function notificationWebSocketUrl(): string | null {
  if (!tokens.access) return null
  const url = new URL('/ws/notifications', GATEWAY)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('access_token', tokens.access)
  return url.toString()
}

function buildUrl(base: string, params?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(base)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  return url.toString()
}

async function refreshAccess() {
  if (!tokens.refresh) return false
  const res = await fetch(`${API_BASES.auth}/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { access: string }
  tokens.set(data.access)
  return true
}

function extractMessage(status: number, payload: unknown) {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (typeof obj.detail === 'string') return obj.detail
    const parts = Object.entries(obj).map(([field, val]) => {
      const message = Array.isArray(val) ? val.join(' ') : String(val)
      return field === 'non_field_errors' ? message : `${field}: ${message}`
    })
    if (parts.length) return parts.join(' · ')
  }
  return `Request failed (${status})`
}

export async function request<T>(url: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = options
  const isFormData = body instanceof FormData
  const finalHeaders: Record<string, string> = { ...headers }
  if (body !== undefined && !isFormData) finalHeaders['Content-Type'] = 'application/json'
  if (auth && tokens.access) finalHeaders.Authorization = `Bearer ${tokens.access}`

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  })

  if (res.status === 401 && auth && retry && tokens.refresh && (await refreshAccess())) {
    return request<T>(url, options, false)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) throw new ApiError(res.status, extractMessage(res.status, payload))
  return payload as T
}

export const authApi = {
  register(username: string, email: string, password: string) {
    return request<{ id: number; username: string; email: string }>(`${API_BASES.auth}/register/`, {
      method: 'POST',
      body: { username, email, password },
      auth: false,
    })
  },
  login(username: string, password: string, two_factor_code?: string) {
    return request<TokenPair | TwoFactorRequired>(`${API_BASES.auth}/login/`, {
      method: 'POST',
      body: { username, password, two_factor_code },
      auth: false,
    })
  },
  logout(refresh: string) {
    return request<void>(`${API_BASES.auth}/logout/`, { method: 'POST', body: { refresh } })
  },
  logoutAll() {
    return request<void>(`${API_BASES.auth}/logout-all/`, { method: 'POST' })
  },
  sessions() {
    return request<AuthSessionDto[]>(`${API_BASES.auth}/sessions/`)
  },
  revokeSession(id: number) {
    return request<void>(`${API_BASES.auth}/sessions/${id}/`, { method: 'DELETE' })
  },
  changePassword(old_password: string, new_password: string) {
    return request<void>(`${API_BASES.auth}/password/change/`, {
      method: 'POST',
      body: { old_password, new_password },
    })
  },
  forgotPassword(email: string) {
    return request<PasswordResetRequestResponse>(`${API_BASES.auth}/password/forgot/`, {
      method: 'POST',
      body: { email },
      auth: false,
    })
  },
  resetPassword(token: string, new_password: string) {
    return request<void>(`${API_BASES.auth}/password/reset/confirm/`, {
      method: 'POST',
      body: { token, new_password },
      auth: false,
    })
  },
}

export const profilesApi = {
  async me() {
    const profiles = await request<ProfileDto[]>(`${API_BASES.profiles}/`)
    return profiles[0] ?? null
  },
  update(id: number, patch: Partial<Pick<ProfileDto, 'username' | 'biography' | 'timezone' | 'language' | 'preferences'>>) {
    return request<ProfileDto>(`${API_BASES.profiles}/${id}/`, { method: 'PATCH', body: patch })
  },
  resolveByAuthIds(authUserIds: number[]) {
    return request<ProfileDto[]>(buildUrl(`${API_BASES.profiles}/resolve/`, { auth_user_ids: authUserIds.join(',') }))
  },
  search(q: string) {
    return request<ProfileSearchResultDto[]>(buildUrl(`${API_BASES.profiles}/search/`, { q }))
  },
  uploadPicture(file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<ProfileDto>(`${API_BASES.profiles}/picture/`, { method: 'POST', body })
  },
  deletePicture() {
    return request<void>(`${API_BASES.profiles}/picture/`, { method: 'DELETE' })
  },
}

export const workspacesApi = {
  list() {
    return request<WorkspaceDto[]>(`${API_BASES.workspaces}/`)
  },
  create(input: { name: string; description?: string; visibility?: 'PRIVATE' | 'PUBLIC'; publicContributionsEnabled?: boolean }) {
    return request<WorkspaceDto>(`${API_BASES.workspaces}/`, { method: 'POST', body: input })
  },
  members(workspaceId: number) {
    return request<{ members: WorkspaceMemberDto[] }>(`${API_BASES.workspaces}/${workspaceId}/members/`)
  },
  inviteMember(workspaceId: number, input: { email: string; role: WorkspaceMemberDto['role'] }) {
    return request<WorkspaceInvitationDto>(`${API_BASES.workspaces}/${workspaceId}/invitations`, {
      method: 'POST',
      body: input,
    })
  },
  changeMemberRole(workspaceId: number, targetUserId: number, role: WorkspaceMemberDto['role']) {
    return request<WorkspaceMemberDto>(`${API_BASES.workspaces}/${workspaceId}/members/${targetUserId}/role`, {
      method: 'PATCH',
      body: { role },
    })
  },
  removeMember(workspaceId: number, targetUserId: number) {
    return request<void>(`${API_BASES.workspaces}/${workspaceId}/members/${targetUserId}`, { method: 'DELETE' })
  },
  update(id: number, input: Partial<{ name: string; description: string; visibility: 'PRIVATE' | 'PUBLIC'; publicContributionsEnabled: boolean }>) {
    return request<WorkspaceDto>(`${API_BASES.workspaces}/${id}`, { method: 'PATCH', body: input })
  },
  archive(id: number) {
    return request<WorkspaceDto>(`${API_BASES.workspaces}/${id}/archive`, { method: 'POST' })
  },
}

export const categoriesApi = {
  list(workspaceId?: number) {
    return request<CategoryDto[]>(buildUrl(`${API_BASES.categories}/`, { workspace_id: workspaceId }))
  },
  get(id: number) {
    return request<CategoryDto>(`${API_BASES.categories}/${id}`)
  },
  create(input: { workspace_id: number; name: string; description?: string }) {
    return request<CategoryDto>(`${API_BASES.categories}/`, { method: 'POST', body: input })
  },
  members(id: number) {
    return request<CategoryMemberDto[]>(`${API_BASES.categories}/${id}/members`)
  },
  update(id: number, input: Partial<{ name: string; description: string }>) {
    return request<CategoryDto>(`${API_BASES.categories}/${id}`, { method: 'PATCH', body: input })
  },
  archive(id: number) {
    return request<CategoryDto>(`${API_BASES.categories}/${id}/archive`, { method: 'POST' })
  },
}

export const tasksApi = {
  list(params?: { workspace_id?: number; category_id?: number; status?: TaskStatusDto; priority?: string }) {
    return request<TaskDto[]>(buildUrl(`${API_BASES.tasks}/`, params))
  },
  get(id: number) {
    return request<TaskDto>(`${API_BASES.tasks}/${id}`)
  },
  permissions(id: number) {
    return request<TaskPermissionDto>(`${API_BASES.tasks}/${id}/permissions`)
  },
  create(input: Partial<TaskDto> & { category_id: number; title: string }) {
    return request<TaskDto>(`${API_BASES.tasks}/`, { method: 'POST', body: input })
  },
  addAssignment(taskId: number, assigneeUserId: number) {
    return request<{ id: number; assignee_user_id: number; assigned_by_user_id: number }>(
      `${API_BASES.tasks}/${taskId}/assignments`,
      { method: 'POST', body: { assignee_user_id: assigneeUserId } },
    )
  },
  addTag(taskId: number, name: string, color?: string) {
    return request<TaskDto>(`${API_BASES.tasks}/${taskId}/tags`, {
      method: 'POST',
      body: { name, ...(color ? { color } : {}) },
    })
  },
  createSubtask(taskId: number, title: string, position: number) {
    return request<{ id: number; title: string; done: boolean; position: number }>(
      `${API_BASES.tasks}/${taskId}/subtasks`,
      { method: 'POST', body: { title, position } },
    )
  },
  upsertRecurrence(taskId: number, enabled: boolean, rule: Record<string, unknown>) {
    return request<{ id: number; enabled: boolean; rule: Record<string, unknown> }>(
      `${API_BASES.tasks}/${taskId}/recurrence`,
      { method: 'PUT', body: { enabled, rule } },
    )
  },
  createReminder(taskId: number, remindAt: string) {
    return request<{ id: number; remind_at: string; status: string; sent_at: string | null }>(
      `${API_BASES.tasks}/${taskId}/reminders`,
      { method: 'POST', body: { remind_at: remindAt } },
    )
  },
  update(id: number, input: Partial<{ title: string; description: string; done: boolean; priority: string; due_at: string | null; status: TaskStatusDto; kanban_column_id: number | null }>) {
    return request<TaskDto>(`${API_BASES.tasks}/${id}`, { method: 'PATCH', body: input })
  },
  complete(id: number) {
    return request<TaskDto>(`${API_BASES.tasks}/${id}/complete`, { method: 'POST' })
  },
  archive(id: number) {
    return request<TaskDto>(`${API_BASES.tasks}/${id}/archive`, { method: 'POST' })
  },
  remove(id: number) {
    return request<void>(`${API_BASES.tasks}/${id}`, { method: 'DELETE' })
  },
  columns() {
    return request<KanbanColumnDto[]>(`${API_BASES.tasks}/kanban-columns`)
  },
  activity(taskId: number) {
    return request<TaskActivityDto[]>(`${API_BASES.tasks}/${taskId}/activity`)
  },
}

export const commentsApi = {
  list(taskId: number) {
    return request<CommentDto[]>(buildUrl(`${API_BASES.comments}/`, { task_id: taskId }))
  },
  create(taskId: number, body: string) {
    return request<CommentDto>(`${API_BASES.comments}/`, { method: 'POST', body: { task_id: taskId, body } })
  },
  update(id: number, body: string) {
    return request<CommentDto>(`${API_BASES.comments}/${id}`, { method: 'PATCH', body: { body } })
  },
  remove(id: number) {
    return request<void>(`${API_BASES.comments}/${id}`, { method: 'DELETE' })
  },
}

export const statisticsApi = {
  overview(params?: { workspace_id?: number; category_id?: number; priority?: string; status?: string }) {
    return request<StatisticsOverviewDto>(buildUrl(`${API_BASES.statistics}/overview`, params))
  },
}

export const attachmentsApi = {
  listTask(taskId: number) {
    return request<AttachmentDto[]>(`${API_BASES.attachments}/tasks/${taskId}`)
  },
  uploadTask(taskId: number, file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<AttachmentDto>(`${API_BASES.attachments}/tasks/${taskId}`, { method: 'POST', body })
  },
  downloadLink(id: number) {
    return request<{ url: string; expiresAt?: string }>(`${API_BASES.attachments}/${id}/download-link`, { method: 'POST' })
  },
  remove(id: number) {
    return request<void>(`${API_BASES.attachments}/${id}`, { method: 'DELETE' })
  },
}

export const notificationsApi = {
  list(page = 0, size = 20) {
    return request<Page<NotificationDto>>(buildUrl(API_BASES.notifications, { page, size }))
  },
  unreadCount() {
    return request<{ count: number }>(`${API_BASES.notifications}/unread-count`)
  },
  markRead(id: number) {
    return request<NotificationDto>(`${API_BASES.notifications}/${id}/read`, { method: 'PATCH' })
  },
  markAllRead() {
    return request<{ updated: number }>(`${API_BASES.notifications}/read-all`, { method: 'PATCH' })
  },
  remove(id: number) {
    return request<void>(`${API_BASES.notifications}/${id}`, { method: 'DELETE' })
  },
}

export const searchApi = {
  global(q: string, type?: string) {
    return request<SearchResponseDto>(buildUrl(API_BASES.search, { q, type }))
  },
}
