import { notifications, projects, tasks, users, workspaces } from './mockData'
import type { Notification, Project, Task, Workspace } from '@/types'
import {
  attachmentsApi,
  notificationsApi,
  projectsApi,
  tasksApi,
  workspacesApi,
  type TaskStatusDto,
} from '@/services/api'
import {
  attachmentToView,
  notificationToView,
  priorityToApi,
  projectToView,
  statusSlug,
  taskToView,
  workspaceToView,
} from '@/services/mappers'
import { useAuthStore } from '@/stores/auth'

const delay = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'
const toNumberId = (id: string | number | undefined) => Number(String(id ?? '').replace(/^[a-z]+/i, ''))
const currentUser = () => useAuthStore().currentUser

export const workspaceRepository = {
  async list(): Promise<Workspace[]> {
    if (useMocks) { await delay(); return structuredClone(workspaces) }
    return (await workspacesApi.list()).map(workspaceToView)
  }
}

export const projectRepository = {
  async list(workspaceId?: string): Promise<Project[]> {
    if (useMocks) { await delay(); return structuredClone(workspaceId ? projects.filter(p => p.workspaceId === workspaceId) : projects) }
    return (await projectsApi.list(workspaceId ? toNumberId(workspaceId) : undefined)).map(project => projectToView(project, currentUser()))
  },
  async get(id: string): Promise<Project | undefined> {
    if (useMocks) { await delay(); return structuredClone(projects.find(p => p.id === id)) }
    return projectToView(await projectsApi.get(toNumberId(id)), currentUser())
  },
  async create(input: Partial<Project>): Promise<Project> {
    if (!useMocks) {
      const workspaceId = toNumberId(input.workspaceId)
      const project = await projectsApi.create({
        workspace_id: workspaceId,
        name: input.name ?? 'Untitled project',
        description: input.description ?? '',
      })
      return projectToView(project, currentUser())
    }
    await delay()
    const project: Project = { id:`p${projects.length+1}`, workspaceId:input.workspaceId ?? 'w1', key:input.key ?? 'NEW', name:input.name ?? 'Untitled project', description:input.description ?? '', color:input.color ?? '#00a9ad', lead:users[0], favorite:false, updatedAt:'Just now', taskCount:0, completedCount:0 }
    projects.unshift(project)
    return structuredClone(project)
  }
}

export const taskRepository = {
  statuses: [] as TaskStatusDto[],
  async loadStatuses() {
    if (useMocks) return []
    this.statuses = await tasksApi.statuses()
    return this.statuses
  },
  async list(projectId?: string, workspaceId?: string): Promise<Task[]> {
    if (useMocks) { await delay(); return structuredClone(projectId ? tasks.filter(t => t.projectId === projectId) : tasks) }
    const rows = await tasksApi.list({
      project_id: projectId ? toNumberId(projectId) : undefined,
      workspace_id: workspaceId && !projectId ? toNumberId(workspaceId) : undefined,
    })
    return rows.map(task => taskToView(task, currentUser()))
  },
  async get(id: string): Promise<Task | undefined> {
    if (useMocks) { await delay(); return structuredClone(tasks.find(t => t.id === id || t.key === id)) }
    return taskToView(await tasksApi.get(toNumberId(id)), currentUser())
  },
  async create(input: Partial<Task>): Promise<Task> {
    if (!useMocks) {
      const status = this.resolveStatusId(input.status)
      const task = await tasksApi.create({
        project_id: toNumberId(input.projectId),
        title: input.title ?? 'Untitled task',
        description: input.description ?? '',
        priority: priorityToApi(input.priority),
        due_at: input.dueDate || null,
        ...(status ? { status_id: status } : {}),
      })
      return taskToView(task, currentUser())
    }
    await delay()
    const task: Task = { id:`t${tasks.length+1}`, key:`WEB-${50+tasks.length}`, workspaceId:input.workspaceId ?? 'w1', projectId:input.projectId ?? 'p2', title:input.title ?? 'Untitled task', description:input.description ?? '', status:input.status ?? 'To do', priority:input.priority ?? 'Medium', assignee:input.assignee ?? users[0], reporter:users[0], dueDate:input.dueDate, tags:input.tags ?? [], subtasks:[], dependencies:[], reminders:[], attachments:[], comments:[], updatedAt:'Just now', createdAt:'Just now' }
    tasks.unshift(task)
    return structuredClone(task)
  },
  async update(id: string, changes: Partial<Task>): Promise<Task | undefined> {
    if (!useMocks) {
      const statusId = this.resolveStatusId(changes.status)
      const task = await tasksApi.update(toNumberId(id), {
        ...(changes.title !== undefined ? { title: changes.title } : {}),
        ...(changes.description !== undefined ? { description: changes.description } : {}),
        ...(changes.priority !== undefined ? { priority: priorityToApi(changes.priority) } : {}),
        ...(changes.dueDate !== undefined ? { due_at: changes.dueDate || null } : {}),
        ...(statusId ? { status_id: statusId, done: changes.status === 'Done' } : {}),
      })
      return taskToView(task, currentUser())
    }
    await delay(80)
    const index = tasks.findIndex(t => t.id === id)
    if (index < 0) return undefined
    tasks[index] = { ...tasks[index], ...changes, updatedAt:'Just now' }
    return structuredClone(tasks[index])
  },
  async loadDetails(task: Task): Promise<Task> {
    if (useMocks) return task
    const [comments, attachments] = await Promise.all([
      tasksApi.comments(toNumberId(task.id)).catch(() => []),
      attachmentsApi.listTask(toNumberId(task.id)).catch(() => []),
    ])
    return {
      ...task,
      comments: comments.map(comment => ({
        id: String(comment.id),
        author: comment.author_user_id === Number(currentUser().id) ? currentUser() : { id: String(comment.author_user_id), name: `User ${comment.author_user_id}`, username: `user-${comment.author_user_id}`, email: '', initials: `U${comment.author_user_id}` },
        body: comment.body,
        createdAt: comment.created_at,
      })),
      attachments: attachments.map(attachmentToView),
    }
  },
  async createComment(taskId: string, body: string) {
    const comment = await tasksApi.createComment(toNumberId(taskId), body)
    return {
      id: String(comment.id),
      author: currentUser(),
      body: comment.body,
      createdAt: comment.created_at,
    }
  },
  resolveStatusId(status: Partial<Task>['status']) {
    const slug = statusSlug(status)
    return slug ? this.statuses.find(item => item.slug === slug)?.id : undefined
  }
}

export const notificationRepository = {
  async list(): Promise<Notification[]> {
    if (useMocks) { await delay(); return structuredClone(notifications) }
    const page = await notificationsApi.list()
    return page.content.map(notificationToView)
  }
}
