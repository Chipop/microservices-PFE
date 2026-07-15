<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CategoryMembersPanel from '@/components/category/CategoryMembersPanel.vue'
import CategorySettingsNav from '@/components/category/CategorySettingsNav.vue'
import { categoryRepository } from '@/data/repositories'
import type { Category, CategoryMember } from '@/types'

type SettingsSection = 'details' | 'member' | 'features' | 'danger'

const props = defineProps<{
  category: Category
}>()

const route = useRoute()
const router = useRouter()
const activeSection = shallowRef<SettingsSection>('details')
const members = shallowRef<CategoryMember[]>([])
const membersLoading = shallowRef(false)
const membersError = shallowRef('')
const membersLoadedForCategory = shallowRef('')
const detailsForm = reactive({
  name: '',
  key: '',
  description: '',
})

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: 'details', label: 'Details' },
  { id: 'member', label: 'Member' },
  { id: 'features', label: 'Features' },
  { id: 'danger', label: 'Danger zone' },
]

const currentSectionLabel = computed(() => sections.find(section => section.id === activeSection.value)?.label ?? 'Details')

watch(
  () => props.category,
  category => {
    detailsForm.name = category.name
    detailsForm.key = category.key
    detailsForm.description = category.description
  },
  { immediate: true },
)

watch(
  () => route.hash,
  hash => {
    const section = normalizeSection(hash)
    activeSection.value = section
    if (section === 'member') void loadMembers()
  },
  { immediate: true },
)

watch(
  () => props.category.id,
  () => {
    members.value = []
    membersError.value = ''
    membersLoadedForCategory.value = ''
    if (activeSection.value === 'member') void loadMembers()
  },
)

async function selectSection(section: string) {
  const nextSection = normalizeSection(`#${section}`)
  activeSection.value = nextSection
  await router.replace({ hash: `#${nextSection}` })
  if (nextSection === 'member') void loadMembers()
}

async function loadMembers() {
  if (membersLoading.value || membersLoadedForCategory.value === props.category.id) return
  membersLoading.value = true
  membersError.value = ''
  try {
    members.value = await categoryRepository.members(props.category.id)
    membersLoadedForCategory.value = props.category.id
  } catch (exc) {
    members.value = []
    membersLoadedForCategory.value = ''
    membersError.value = exc instanceof Error ? exc.message : 'Could not load category members.'
  } finally {
    membersLoading.value = false
  }
}

function normalizeSection(hash: string): SettingsSection {
  const value = hash.replace(/^#/, '')
  if (value === 'people') return 'member'
  if (value === 'member' || value === 'features' || value === 'danger') return value
  return 'details'
}
</script>

<template>
  <div class="settings-layout category-settings-layout">
    <CategorySettingsNav
      :sections="sections"
      :active-section="activeSection"
      @section-change="selectSection"
    />

    <div class="category-settings-content">
      <form
        v-if="activeSection === 'details'"
        class="panel form-stack"
      >
        <h2 id="details">{{ currentSectionLabel }}</h2>
        <label>
          Name
          <input v-model="detailsForm.name" />
        </label>
        <label>
          Key
          <input v-model="detailsForm.key" readonly />
        </label>
        <label>
          Description
          <textarea v-model="detailsForm.description" rows="4"></textarea>
        </label>
        <button class="btn btn-primary align-start" type="button">
          Save changes
        </button>
      </form>

      <CategoryMembersPanel
        v-else-if="activeSection === 'member'"
        :members="members"
        :loading="membersLoading"
        :error="membersError"
      />

      <section
        v-else-if="activeSection === 'features'"
        class="panel form-stack"
      >
        <h2 id="features">Features</h2>
        <div class="setting-row">
          <div>
            <strong>Task workflows</strong>
            <p>Board, list, timeline, backlog and files remain enabled for this category.</p>
          </div>
          <span class="status-badge" data-status="done">Enabled</span>
        </div>
      </section>

      <section
        v-else
        class="panel form-stack"
      >
        <h2 id="danger">Danger zone</h2>
        <div class="danger-box">
          <div>
            <strong>Archive category</strong>
            <p>Hide this category while keeping its history.</p>
          </div>
          <button class="btn" type="button">Archive</button>
        </div>
        <div class="danger-box">
          <div>
            <strong>Delete category</strong>
            <p>Permanently remove this category and its data.</p>
          </div>
          <button class="btn btn-danger" type="button">Delete</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.category-settings-content {
  min-width: 0;
}
</style>
