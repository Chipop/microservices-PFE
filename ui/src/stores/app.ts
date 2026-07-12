import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { projectRepository, taskRepository, workspaceRepository } from '@/data/repositories'
import type { Project, Task, Workspace } from '@/types'
import { useAuthStore } from './auth'

export const useAppStore = defineStore('app', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspaceId = ref('')
  const projects = ref<Project[]>([])
  const tasks = ref<Task[]>([])
  const sidebarCollapsed = ref(false)
  const loading = ref(false)
  const globalQuery = ref('')
  const error = ref('')
  const auth = useAuthStore()
  const currentUser = computed(() => auth.currentUser)

  const currentWorkspace = computed(() => workspaces.value.find(w => w.id === currentWorkspaceId.value))
  const currentProjects = computed(() => projects.value.filter(p => p.workspaceId === currentWorkspaceId.value))

  async function initialize() {
    loading.value = true
    error.value = ''
    try {
      await auth.initialize()
      workspaces.value = await workspaceRepository.list()
      if (!currentWorkspaceId.value || !workspaces.value.some(w => w.id === currentWorkspaceId.value)) {
        currentWorkspaceId.value = workspaces.value[0]?.id ?? ''
      }
      await taskRepository.loadStatuses()
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
      projects.value = []
      tasks.value = []
      return
    }
    const [workspaceProjects, workspaceTasks] = await Promise.all([
      projectRepository.list(currentWorkspaceId.value),
      taskRepository.list(undefined, currentWorkspaceId.value),
    ])
    projects.value = withTaskMetrics(workspaceProjects, workspaceTasks)
    tasks.value = workspaceTasks
  }

  async function switchWorkspace(id: string) {
    currentWorkspaceId.value = id
    await loadWorkspaceData()
  }
  function setWorkspaceSelection(rows: Workspace[], selectedId: string) {
    workspaces.value = rows
    currentWorkspaceId.value = selectedId
  }
  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
  async function createTask(input: Partial<Task>) {
    const task = await taskRepository.create({ ...input, workspaceId:currentWorkspaceId.value })
    tasks.value.unshift(task)
    projects.value = withTaskMetrics(projects.value, tasks.value)
    return task
  }
  async function updateTask(id: string, changes: Partial<Task>) {
    const task = await taskRepository.update(id, changes)
    if (!task) return
    const index = tasks.value.findIndex(t => t.id === id)
    if (index >= 0) tasks.value[index] = task
    projects.value = withTaskMetrics(projects.value, tasks.value)
  }
  async function createProject(input: Partial<Project>) {
    const project = await projectRepository.create({ ...input, workspaceId:currentWorkspaceId.value })
    projects.value.unshift(project)
    return project
  }
  async function hydrateTaskDetails(id: string) {
    const task = tasks.value.find(item => item.id === id || item.key === id) ?? await taskRepository.get(id)
    if (!task) return undefined
    const detailed = await taskRepository.loadDetails(task)
    const index = tasks.value.findIndex(item => item.id === detailed.id)
    if (index >= 0) tasks.value[index] = detailed
    else tasks.value.unshift(detailed)
    return detailed
  }
  async function addComment(taskId: string, body: string) {
    const comment = await taskRepository.createComment(taskId, body)
    const task = tasks.value.find(item => item.id === taskId)
    if (task) task.comments.unshift(comment)
  }

  function reset() {
    workspaces.value = []
    currentWorkspaceId.value = ''
    projects.value = []
    tasks.value = []
    error.value = ''
  }

  return { currentUser, workspaces, currentWorkspaceId, currentWorkspace, projects, currentProjects, tasks, sidebarCollapsed, loading, globalQuery, error, initialize, loadWorkspaceData, switchWorkspace, setWorkspaceSelection, toggleSidebar, createTask, updateTask, createProject, hydrateTaskDetails, addComment, reset }
})

function withTaskMetrics(projects: Project[], tasks: Task[]) {
  return projects.map(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.id)
    return {
      ...project,
      taskCount: projectTasks.length,
      completedCount: projectTasks.filter(task => task.status === 'Done').length,
    }
  })
}
