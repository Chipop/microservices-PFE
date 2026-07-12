export type Priority = 'Highest' | 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Backlog' | 'To do' | 'In progress' | 'Review' | 'Done'

export interface User {
  id: string
  name: string
  username: string
  email: string
  initials: string
  role?: string
  avatar?: string
}

export interface Workspace {
  id: string
  name: string
  key: string
  description: string
  memberCount: number
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  workspaceType: 'PERSONAL' | 'TEAM'
}

export interface Project {
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

export interface Task {
  id: string
  key: string
  workspaceId: string
  projectId: string
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
  updatedAt: string
  createdAt: string
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
