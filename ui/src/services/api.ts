const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:8080'

export const API_BASES = {
  auth: `${GATEWAY}/api/auth`,
  profiles: `${GATEWAY}/api/profiles`,
  workspaces: `${GATEWAY}/api/workspaces`,
  projects: `${GATEWAY}/api/projects`,
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

export interface ProjectDto {
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

export interface TaskStatusDto {
  id: number
  name: string
  slug: string
  position?: number
  is_terminal?: boolean
}

export interface KanbanColumnDto {
  id: number
  name: string
  position?: number
}

export interface TaskDto {
  id: number
  project_id: number | null
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
  status: TaskStatusDto | null
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
  author_user_id: number
  body: string
  created_at: string
  updated_at: string
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
}

export const profilesApi = {
  async me() {
    const profiles = await request<ProfileDto[]>(`${API_BASES.profiles}/`)
    return profiles[0] ?? null
  },
  update(id: number, patch: Partial<Pick<ProfileDto, 'username' | 'biography' | 'timezone' | 'language' | 'preferences'>>) {
    return request<ProfileDto>(`${API_BASES.profiles}/${id}/`, { method: 'PATCH', body: patch })
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
  update(id: number, input: Partial<{ name: string; description: string; visibility: 'PRIVATE' | 'PUBLIC'; publicContributionsEnabled: boolean }>) {
    return request<WorkspaceDto>(`${API_BASES.workspaces}/${id}`, { method: 'PATCH', body: input })
  },
  archive(id: number) {
    return request<WorkspaceDto>(`${API_BASES.workspaces}/${id}/archive`, { method: 'POST' })
  },
}

export const projectsApi = {
  list(workspaceId?: number) {
    return request<ProjectDto[]>(buildUrl(`${API_BASES.projects}/`, { workspace_id: workspaceId }))
  },
  get(id: number) {
    return request<ProjectDto>(`${API_BASES.projects}/${id}`)
  },
  create(input: { workspace_id: number; name: string; description?: string }) {
    return request<ProjectDto>(`${API_BASES.projects}/`, { method: 'POST', body: input })
  },
  update(id: number, input: Partial<{ name: string; description: string }>) {
    return request<ProjectDto>(`${API_BASES.projects}/${id}`, { method: 'PATCH', body: input })
  },
  archive(id: number) {
    return request<ProjectDto>(`${API_BASES.projects}/${id}/archive`, { method: 'POST' })
  },
}

export const tasksApi = {
  list(params?: { workspace_id?: number; project_id?: number; status_id?: number; priority?: string }) {
    return request<TaskDto[]>(buildUrl(`${API_BASES.tasks}/`, params))
  },
  get(id: number) {
    return request<TaskDto>(`${API_BASES.tasks}/${id}`)
  },
  create(input: Partial<TaskDto> & { project_id: number; title: string }) {
    return request<TaskDto>(`${API_BASES.tasks}/`, { method: 'POST', body: input })
  },
  update(id: number, input: Partial<{ title: string; description: string; done: boolean; priority: string; due_at: string | null; status_id: number; kanban_column_id: number | null }>) {
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
  statuses() {
    return request<TaskStatusDto[]>(`${API_BASES.tasks}/statuses`)
  },
  columns() {
    return request<KanbanColumnDto[]>(`${API_BASES.tasks}/kanban-columns`)
  },
  comments(taskId: number) {
    return request<CommentDto[]>(`${API_BASES.tasks}/${taskId}/comments`)
  },
  createComment(taskId: number, body: string) {
    return request<CommentDto>(`${API_BASES.tasks}/${taskId}/comments`, { method: 'POST', body: { body } })
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
