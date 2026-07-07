import { defineStore, acceptHMRUpdate } from 'pinia';
import { todosApi, type Todo } from '@/services/api';

interface TodosState {
  items: Todo[];
  loading: boolean;
}

export const useTodosStore = defineStore('todos', {
  state: (): TodosState => ({
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
        this.items = await todosApi.list();
      } finally {
        this.loading = false;
      }
    },

    async add(title: string) {
      const todo = await todosApi.create(title);
      this.items.unshift(todo);
    },

    async toggle(todo: Todo) {
      const updated = await todosApi.update(todo.id, { done: !todo.done });
      this.replace(updated);
    },

    async rename(todo: Todo, title: string) {
      const updated = await todosApi.update(todo.id, { title });
      this.replace(updated);
    },

    async remove(id: number) {
      await todosApi.remove(id);
      this.items = this.items.filter((t) => t.id !== id);
    },

    replace(todo: Todo) {
      const i = this.items.findIndex((t) => t.id === todo.id);
      if (i !== -1) this.items.splice(i, 1, todo);
    },

    reset() {
      this.items = [];
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTodosStore, import.meta.hot));
}
