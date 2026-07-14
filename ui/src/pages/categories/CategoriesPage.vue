<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Plus, Search, Star } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import type { Category } from '@/types'

const app = useAppStore()
const query = shallowRef('')

const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return app.currentCategories.filter(category => category.name.toLowerCase().includes(q))
})

function progress(category: Category) {
  return category.taskCount ? Math.round((category.completedCount / category.taskCount) * 100) : 0
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Categories</h1>
        <p>Plan and organize work inside {{ app.currentWorkspace?.name }}.</p>
      </div>
      <RouterLink
        to="/categories/new"
        class="btn btn-primary"
      >
        <Plus :size="16" />
        Create category
      </RouterLink>
    </header>

    <div class="toolbar">
      <div class="search-input">
        <Search :size="16" />
        <input
          v-model="query"
          placeholder="Search categories"
        >
      </div>
      <select>
        <option>All categories</option>
        <option>Favorites</option>
        <option>Recently viewed</option>
      </select>
      <select>
        <option>Sort by updated</option>
        <option>Sort by name</option>
      </select>
    </div>

    <section class="categories-table">
      <div class="table-header">
        <span>Category</span>
        <span>Lead</span>
        <span>Progress</span>
        <span>Updated</span>
        <span></span>
      </div>

      <RouterLink
        v-for="category in filtered"
        :key="category.id"
        :to="`/categories/${category.id}/overview`"
        class="category-table-row"
      >
        <span class="category-name-cell">
          <span
            class="category-icon"
            :style="{ background: category.color }"
          >
            {{ category.key[0] }}
          </span>
          <span>
            <strong>{{ category.name }}</strong>
            <small>{{ category.key }} · {{ category.description }}</small>
          </span>
        </span>
        <span>{{ category.lead.name }}</span>
        <span>
          <span class="progress">
            <i :style="{ width: `${progress(category)}%` }"></i>
          </span>
          <small>{{ category.completedCount }} / {{ category.taskCount }}</small>
        </span>
        <span>{{ category.updatedAt }}</span>
        <Star
          :size="16"
          :class="{ filled: category.favorite }"
        />
      </RouterLink>
    </section>
  </div>
</template>
