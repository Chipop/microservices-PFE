import { inject, provide, type InjectionKey } from 'vue'

interface OpenCreateTaskOptions {
  categoryId?: string
}

interface TaskCreationContext {
  openCreateTask: (options?: OpenCreateTaskOptions) => void
}

const taskCreationKey: InjectionKey<TaskCreationContext> = Symbol('taskCreation')

export function provideTaskCreation(context: TaskCreationContext) {
  provide(taskCreationKey, context)
}

export function useTaskCreation() {
  const context = inject(taskCreationKey)
  if (!context) {
    throw new Error('useTaskCreation must be used inside AppShell.')
  }
  return context
}

export type { OpenCreateTaskOptions }
