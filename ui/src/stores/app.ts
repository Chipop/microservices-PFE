import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { categoryRepository, taskRepository, workspaceRepository } from '@/data/repositories'
import type { CreateTaskInput, Category, Task, Workspace, WorkspaceMember, WorkspaceRole } from '@/types'
import { useAuthStore } from './auth'

export const useAppStore = defineStore('app', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspaceId = ref('')
  const categories = ref<Category[]>([])
  const tasks = ref<Task[]>([])
  const workspaceMembers = ref<WorkspaceMember[]>([])
  const sidebarCollapsed = ref(false)
  const loading = ref(false)
  const globalQuery = ref('')
  const error = ref('')
  const auth = useAuthStore()
  const currentUser = computed(() => auth.currentUser)

  const currentWorkspace = computed(() => workspaces.value.find(w => w.id === currentWorkspaceId.value))
  const currentCategories = computed(() => categories.value.filter(p => p.workspaceId === currentWorkspaceId.value))

  async function initialize() {
    loading.value = true
    error.value = ''
    try {
      await auth.initialize()
      workspaces.value = await workspaceRepository.list()
      if (!currentWorkspaceId.value || !workspaces.value.some(w => w.id === currentWorkspaceId.value)) {
        currentWorkspaceId.value = workspaces.value[0]?.id ?? ''
      }
      await loadWorkspaceData()
    } catch (exc) {
      error.value = exc instanceof Error ? exc.message : 'Could not load application data.'
      throw exc
    } finally {
      loading.value = false
    }
  }

  async function loadWorkspaceData() {
    if (!currentWorkspaceId.value) {
      categories.value = []
      tasks.value = []
      workspaceMembers.value = []
      return
    }
    const [workspaceCategories, workspaceTasks, members] = await Promise.all([
      categoryRepository.list(currentWorkspaceId.value),
      taskRepository.list(undefined, currentWorkspaceId.value),
      workspaceRepository.members(currentWorkspaceId.value),
    ])
    const mergedTasks = mergeWorkspaceTasks(tasks.value, workspaceTasks, currentWorkspaceId.value)
    categories.value = withTaskMetrics(workspaceCategories, mergedTasks)
    tasks.value = mergedTasks
    workspaceMembers.value = members
    updateWorkspaceMemberCount(workspaces.value, currentWorkspaceId.value, members.length)
  }

  async function switchWorkspace(id: string) {
    currentWorkspaceId.value = id
    await loadWorkspaceData()
  }
  async function updateWorkspace(id: string, changes: Partial<Pick<Workspace, 'name' | 'description' | 'visibility' | 'publicContributionsEnabled'>>) {
    const workspace = await workspaceRepository.update(id, changes)
    const index = workspaces.value.findIndex(item => item.id === id)
    if (index >= 0) workspaces.value[index] = workspace
    return workspace
  }
  async function createWorkspace(input: Pick<Workspace, 'name'> & Partial<Pick<Workspace, 'description' | 'visibility' | 'publicContributionsEnabled'>>) {
    error.value = ''
    try {
      const workspace = await workspaceRepository.create(input)
      workspaces.value.unshift(workspace)
      currentWorkspaceId.value = workspace.id
      await loadWorkspaceData()
      return workspace
    } catch (exc) {
      error.value = exc instanceof Error ? exc.message : 'Could not create workspace.'
      throw exc
    }
  }
  async function archiveWorkspace(id: string) {
    const workspace = await workspaceRepository.archive(id)
    workspaces.value = workspaces.value.filter(item => item.id !== id)
    if (currentWorkspaceId.value === id) {
      currentWorkspaceId.value = workspaces.value[0]?.id ?? ''
      await loadWorkspaceData()
    }
    return workspace
  }
  function setWorkspaceSelection(rows: Workspace[], selectedId: string) {
    workspaces.value = rows
    currentWorkspaceId.value = selectedId
  }
  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
  async function createTask(input: CreateTaskInput) {
    const task = await taskRepository.create({ ...input, workspaceId:currentWorkspaceId.value })
    tasks.value.unshift(task)
    categories.value = withTaskMetrics(categories.value, tasks.value)
    return task
  }
  async function updateTask(id: string, changes: Partial<Task>) {
    error.value = ''
    try {
      const task = await taskRepository.update(id, changes)
      if (!task) return
      const index = tasks.value.findIndex(t => t.id === id)
      if (index >= 0) tasks.value[index] = mergeTask(tasks.value[index], task)
      categories.value = withTaskMetrics(categories.value, tasks.value)
    } catch (exc) {
      error.value = exc instanceof Error ? exc.message : 'Could not update task.'
      throw exc
    }
  }
  async function createCategory(input: Partial<Category>) {
    const category = await categoryRepository.create({ ...input, workspaceId:currentWorkspaceId.value })
    categories.value.unshift(category)
    return category
  }
  async function hydrateTaskDetails(id: string) {
    const task = tasks.value.find(item => item.id === id || item.key === id) ?? await taskRepository.get(id)
    if (!task) return undefined
    const detailed = await taskRepository.loadDetails(task)
    const index = tasks.value.findIndex(item => item.id === detailed.id)
    if (index >= 0) tasks.value[index] = mergeTask(tasks.value[index], detailed)
    else tasks.value.unshift(detailed)
    return detailed
  }
  async function addComment(taskId: string, body: string) {
    const comment = await taskRepository.createComment(taskId, body)
    const task = tasks.value.find(item => item.id === taskId)
    if (task) task.comments.unshift(comment)
  }
  async function inviteWorkspaceMember(email: string, role: Exclude<WorkspaceRole, 'OWNER'>) {
    if (!currentWorkspaceId.value) throw new Error('No workspace is selected.')
    error.value = ''
    try {
      const invitation = await workspaceRepository.inviteMember(currentWorkspaceId.value, email, role)
      await refreshWorkspaceMembers()
      return invitation
    } catch (exc) {
      error.value = exc instanceof Error ? exc.message : 'Could not invite member.'
      throw exc
    }
  }
  async function changeWorkspaceMemberRole(userId: string, role: Exclude<WorkspaceRole, 'OWNER'>) {
    if (!currentWorkspaceId.value) throw new Error('No workspace is selected.')
    error.value = ''
    try {
      const member = await workspaceRepository.changeMemberRole(currentWorkspaceId.value, userId, role)
      const index = workspaceMembers.value.findIndex(item => item.id === userId)
      if (index >= 0) workspaceMembers.value[index] = member
      return member
    } catch (exc) {
      error.value = exc instanceof Error ? exc.message : 'Could not update member role.'
      throw exc
    }
  }
  async function removeWorkspaceMember(userId: string) {
    if (!currentWorkspaceId.value) throw new Error('No workspace is selected.')
    error.value = ''
    try {
      await workspaceRepository.removeMember(currentWorkspaceId.value, userId)
      workspaceMembers.value = workspaceMembers.value.filter(member => member.id !== userId)
      updateWorkspaceMemberCount(workspaces.value, currentWorkspaceId.value, workspaceMembers.value.length)
    } catch (exc) {
      error.value = exc instanceof Error ? exc.message : 'Could not remove member.'
      throw exc
    }
  }
  async function refreshWorkspaceMembers() {
    if (!currentWorkspaceId.value) {
      workspaceMembers.value = []
      return []
    }
    workspaceMembers.value = await workspaceRepository.members(currentWorkspaceId.value)
    updateWorkspaceMemberCount(workspaces.value, currentWorkspaceId.value, workspaceMembers.value.length)
    return workspaceMembers.value
  }

  function reset() {
    workspaces.value = []
    currentWorkspaceId.value = ''
    categories.value = []
    tasks.value = []
    workspaceMembers.value = []
    error.value = ''
  }

  return { currentUser, workspaces, currentWorkspaceId, currentWorkspace, workspaceMembers, categories, currentCategories, tasks, sidebarCollapsed, loading, globalQuery, error, initialize, loadWorkspaceData, switchWorkspace, createWorkspace, updateWorkspace, archiveWorkspace, setWorkspaceSelection, toggleSidebar, createTask, updateTask, createCategory, hydrateTaskDetails, addComment, inviteWorkspaceMember, changeWorkspaceMemberRole, removeWorkspaceMember, refreshWorkspaceMembers, reset }
})

function withTaskMetrics(categories: Category[], tasks: Task[]) {
  return categories.map(category => {
    const categoryTasks = tasks.filter(task => task.categoryId === category.id)
    return {
      ...category,
      taskCount: categoryTasks.length,
      completedCount: categoryTasks.filter(task => task.status === 'Done').length,
    }
  })
}

function mergeTask(previous: Task, next: Task): Task {
  return {
    ...previous,
    ...next,
    comments: next.comments.length ? next.comments : previous.comments,
    attachments: next.attachments.length ? next.attachments : previous.attachments,
    activities: next.activities.length ? next.activities : previous.activities,
    permissions: next.permissions ?? previous.permissions,
  }
}

function mergeWorkspaceTasks(previousTasks: Task[], workspaceTasks: Task[], workspaceId: string): Task[] {
  const previousById = new Map(
    previousTasks
      .filter(task => task.workspaceId === workspaceId)
      .map(task => [task.id, task]),
  )
  return workspaceTasks.map(task => {
    const previous = previousById.get(task.id)
    return previous ? mergeTask(previous, task) : task
  })
}

function updateWorkspaceMemberCount(workspaces: Workspace[], workspaceId: string, memberCount: number) {
  const workspace = workspaces.find(item => item.id === workspaceId)
  if (workspace) workspace.memberCount = memberCount
}
