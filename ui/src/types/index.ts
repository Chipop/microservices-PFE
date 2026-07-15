export type Priority = 'Highest' | 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Backlog' | 'To do' | 'In progress' | 'Review' | 'Done'
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type CategoryRole = 'CATEGORY_OWNER' | 'CATEGORY_ADMIN' | 'CONTRIBUTOR' | 'VIEWER'

export interface User {
  id: string
  name: string
  username: string
  email: string
  initials: string
  avatar?: string
}

export type WorkspaceMember = User & { role: WorkspaceRole }
export type CategoryMember = User & { role: CategoryRole; joinedAt: string }

export interface Workspace {
  id: string
  name: string
  key: string
  description: string
  memberCount: number
  role: WorkspaceRole
  workspaceType: 'PERSONAL' | 'TEAM'
  visibility?: 'PRIVATE' | 'PUBLIC'
  publicContributionsEnabled?: boolean
}

export interface Category {
  id: string
  workspaceId: string
  key: string
  name: string
  description: string
  color: string
  lead: User
  favorite: boolean
  updatedAt: string
  taskCount: number
  completedCount: number
}

export interface Comment {
  id: string
  author: User
  body: string
  createdAt: string
}

export interface TaskActivity {
  id: string
  actor: User
  type: string
  fromValue?: string
  toValue?: string
  message: string
  createdAt: string
}

export interface TaskPermissions {
  canView: boolean
  canContribute: boolean
  canAdmin: boolean
  canDelete: boolean
}

export interface Task {
  id: string
  key: string
  workspaceId: string
  categoryId: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assignee?: User
  reporter: User
  dueDate?: string
  tags: string[]
  subtasks: { id: string; title: string; done: boolean }[]
  dependencies: string[]
  recurrence?: string
  reminders: string[]
  attachments: { id: string; name: string; size: string }[]
  comments: Comment[]
  activities: TaskActivity[]
  permissions?: TaskPermissions
  updatedAt: string
  createdAt: string
}

export interface CreateTaskInput {
  title: string
  categoryId: string
  workspaceId?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  dueDate?: string
  assignee?: User
  assigneeUsername?: string
  assigneeUserId?: string
  tags?: string[]
  subtaskTitles?: string[]
  reminderDates?: string[]
  recurrence?: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  relatedResourceType?: string
  relatedResourceId?: string
}
