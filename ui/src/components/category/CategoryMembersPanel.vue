<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { CategoryMember, CategoryRole } from '@/types'

const props = defineProps<{
  members: CategoryMember[]
  loading: boolean
  error: string
}>()

const memberCountLabel = computed(() => {
  if (props.loading) return 'Loading members...'
  const count = props.members.length
  return `${count} ${count === 1 ? 'member' : 'members'}`
})

function roleLabel(role: CategoryRole) {
  if (role === 'CATEGORY_OWNER') return 'Owner'
  if (role === 'CATEGORY_ADMIN') return 'Admin'
  if (role === 'CONTRIBUTOR') return 'Contributor'
  return 'Viewer'
}
</script>

<template>
  <section class="panel members-panel">
    <div class="panel-header">
      <div>
        <h2>Member</h2>
        <p>{{ memberCountLabel }}</p>
      </div>
    </div>

    <p v-if="error" class="member-error">{{ error }}</p>

    <div v-if="loading" class="empty-state compact">
      <h3>Loading members</h3>
      <p>Fetching category access from the server.</p>
    </div>

    <div v-else-if="!error && members.length" class="members-table">
      <div class="table-header">
        <span>Member</span>
        <span>Role</span>
        <span>Status</span>
        <span>Added</span>
      </div>

      <div
        v-for="member in members"
        :key="member.id"
        class="member-row"
      >
        <span class="person-field">
          <Avatar
            :initials="member.initials"
            :src="member.avatar"
            size="sm"
          />
          <span>
            <strong>{{ member.name }}</strong>
            <small>{{ member.email || member.username }}</small>
          </span>
        </span>

        <strong>{{ roleLabel(member.role) }}</strong>
        <StatusBadge value="Active" />
        <span class="member-date">{{ member.joinedAt || 'Unknown' }}</span>
      </div>
    </div>

    <div v-else-if="!error" class="empty-state compact">
      <h3>No category members</h3>
      <p>This category does not have explicit members yet.</p>
    </div>
  </section>
</template>

<style scoped>
.member-error {
  color: var(--danger);
  margin: 0;
  padding: 14px 18px;
}

.member-date {
  color: var(--muted);
  font-size: 12px;
}
</style>
