import { defineStore, acceptHMRUpdate } from 'pinia';
import { tasksApi, type Task } from '@/services/api';

interface TasksState {
  items: Task[];
  loading: boolean;
}

export const useTasksStore = defineStore('tasks', {
  state: (): TasksState => ({
    items: [],
    loading: false,
  }),

  getters: {
    remaining: (state) => state.items.filter((t) => !t.done).length,
    total: (state) => state.items.length,
  },

  actions: {
    async fetch() {
      this.loading = true;
      try {
        this.items = await tasksApi.list();
      } finally {
        this.loading = false;
      }
    },

    async add(title: string) {
      const task = await tasksApi.create(title);
      this.items.unshift(task);
    },

    async toggle(task: Task) {
      const updated = await tasksApi.update(task.id, { done: !task.done });
      this.replace(updated);
    },

    async rename(task: Task, title: string) {
      const updated = await tasksApi.update(task.id, { title });
      this.replace(updated);
    },

    async archive(task: Task) {
      await tasksApi.archive(task.id);
      this.items = this.items.filter((t) => t.id !== task.id);
    },

    async remove(id: number) {
      await tasksApi.remove(id);
      this.items = this.items.filter((t) => t.id !== id);
    },

    replace(task: Task) {
      const i = this.items.findIndex((t) => t.id === task.id);
      if (i !== -1) this.items.splice(i, 1, task);
    },

    reset() {
      this.items = [];
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTasksStore, import.meta.hot));
}
