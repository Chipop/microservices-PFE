<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { MoreHorizontal, Trash2, UserPlus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import Avatar from '@/components/common/Avatar.vue'
import Modal from '@/components/common/Modal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { profilesApi, type ProfileSearchResultDto } from '@/services/api'
import { useAppStore } from '@/stores/app'
import type { WorkspaceMember, WorkspaceRole } from '@/types'

type EditableRole = Exclude<WorkspaceRole, 'OWNER'>

const app = useAppStore()
const router = useRouter()
const form = reactive({
  name: '',
  description: '',
  visibility: 'PRIVATE' as 'PRIVATE' | 'PUBLIC',
  publicContributionsEnabled: false,
})
const status = reactive({
  saving: false,
  archiving: false,
  error: '',
  success: '',
})
const memberStatus = reactive({
  error: '',
  success: '',
})
const inviteOpen = shallowRef(false)
const savingInvite = shallowRef(false)
const loadingInviteCandidates = shallowRef(false)
const updatingMemberId = shallowRef('')
const openMenuId = shallowRef('')
const inviteCandidates = shallowRef<ProfileSearchResultDto[]>([])
const inviteForm = reactive({
  email: '',
  role: 'MEMBER' as EditableRole,
})
let inviteSearchTimer: ReturnType<typeof window.setTimeout> | undefined
let inviteSearchRun = 0

const workspace = computed(() => app.currentWorkspace)
const canManageWorkspace = computed(() => workspace.value?.role === 'OWNER' || workspace.value?.role === 'ADMIN')
const accessDenied = computed(() => Boolean(workspace.value) && !canManageWorkspace.value)
const saveLabel = computed(() => status.saving ? 'Saving...' : 'Save changes')
const archiveLabel = computed(() => status.archiving ? 'Archiving...' : 'Archive')
const roleOptions: EditableRole[] = ['ADMIN', 'MEMBER', 'VIEWER']
const existingMemberIds = computed(() => new Set(app.workspaceMembers.map(member => member.id)))
const existingMemberEmails = computed(() => new Set(app.workspaceMembers.map(member => member.email.toLowerCase()).filter(Boolean)))
const filteredInviteCandidates = computed(() => {
  const emailQuery = inviteForm.email.trim().toLowerCase()
  const seen = new Set<string>()
  return inviteCandidates.value.filter(candidate => {
    const email = candidate.email.trim().toLowerCase()
    const dedupeKey = email || String(candidate.auth_user_id)
    const isExistingMember = existingMemberIds.value.has(String(candidate.auth_user_id)) ||
      existingMemberEmails.value.has(email)
    const hasInviteEmail = Boolean(email)
    const matchesEmail = !emailQuery || email.includes(emailQuery)
    const isDuplicate = seen.has(dedupeKey)
    if (hasInviteEmail && !isExistingMember && matchesEmail && !isDuplicate) {
      seen.add(dedupeKey)
      return true
    }
    return false
  })
})
const inviteCandidateStatus = computed(() => {
  if (loadingInviteCandidates.value) return 'Loading users...'
  if (!filteredInviteCandidates.value.length) return 'No matching users to invite.'
  return ''
})

watch(
  workspace,
  current => {
    form.name = current?.name ?? ''
    form.description = current?.description ?? ''
    form.visibility = current?.visibility ?? 'PRIVATE'
    form.publicContributionsEnabled = current?.publicContributionsEnabled ?? false
  },
  { immediate: true },
)

watch(
  () => inviteForm.email,
  email => {
    if (!inviteOpen.value) return
    if (inviteSearchTimer) window.clearTimeout(inviteSearchTimer)
    inviteSearchTimer = window.setTimeout(() => {
      void loadInviteCandidates(email)
    }, 200)
  },
)

async function saveWorkspace() {
  status.error = ''
  status.success = ''
  if (!canManageWorkspace.value) {
    status.error = 'Only workspace owners and admins can update settings.'
    return
  }
  if (!workspace.value) {
    status.error = 'Workspace is not loaded.'
    return
  }
  if (!form.name.trim()) {
    status.error = 'Workspace name is required.'
    return
  }

  status.saving = true
  try {
    await app.updateWorkspace(workspace.value.id, {
      name: form.name.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      publicContributionsEnabled: form.publicContributionsEnabled,
    })
    status.success = 'Workspace settings saved.'
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not save workspace settings.'
  } finally {
    status.saving = false
  }
}

async function archiveWorkspace() {
  status.error = ''
  status.success = ''
  if (!canManageWorkspace.value) {
    status.error = 'Only workspace owners and admins can archive this workspace.'
    return
  }
  if (!workspace.value) {
    status.error = 'Workspace is not loaded.'
    return
  }
  const confirmed = window.confirm(`Archive ${workspace.value.name}?`)
  if (!confirmed) return

  status.archiving = true
  try {
    await app.archiveWorkspace(workspace.value.id)
    await router.push('/workspaces')
  } catch (exc) {
    status.error = exc instanceof Error ? exc.message : 'Could not archive workspace.'
  } finally {
    status.archiving = false
  }
}

function openInviteModal() {
  memberStatus.error = ''
  memberStatus.success = ''
  inviteForm.email = ''
  inviteForm.role = 'MEMBER'
  inviteCandidates.value = []
  inviteOpen.value = true
  void loadInviteCandidates('')
}

async function submitInvite() {
  if (!inviteForm.email.trim() || !canManageWorkspace.value) return
  savingInvite.value = true
  memberStatus.error = ''
  memberStatus.success = ''
  try {
    await app.inviteWorkspaceMember(inviteForm.email.trim(), inviteForm.role)
    inviteOpen.value = false
    memberStatus.success = 'Invitation sent.'
  } catch (exc) {
    memberStatus.error = exc instanceof Error ? exc.message : 'Could not invite member.'
  } finally {
    savingInvite.value = false
  }
}

async function loadInviteCandidates(query: string) {
  const run = ++inviteSearchRun
  loadingInviteCandidates.value = true
  try {
    const candidates = await profilesApi.search(query.trim())
    if (run !== inviteSearchRun) return
    inviteCandidates.value = candidates
  } catch (exc) {
    if (run !== inviteSearchRun) return
    inviteCandidates.value = []
    memberStatus.error = exc instanceof Error ? exc.message : 'Could not load users.'
  } finally {
    if (run === inviteSearchRun) loadingInviteCandidates.value = false
  }
}

function selectInviteCandidate(candidate: ProfileSearchResultDto) {
  inviteForm.email = candidate.email
}

function candidateSecondaryText(candidate: ProfileSearchResultDto) {
  const username = candidate.username.trim()
  if (!username || username.toLowerCase() === candidate.email.trim().toLowerCase()) return ''
  return username
}

async function changeRole(member: WorkspaceMember, event: Event) {
  const select = event.target as HTMLSelectElement
  const nextRole = select.value as EditableRole
  const previousRole = member.role
  if (!canManageWorkspace.value || nextRole === previousRole || member.role === 'OWNER') return
  updatingMemberId.value = member.id
  memberStatus.error = ''
  memberStatus.success = ''
  try {
    await app.changeWorkspaceMemberRole(member.id, nextRole)
    memberStatus.success = 'Role updated.'
  } catch (exc) {
    select.value = previousRole
    memberStatus.error = exc instanceof Error ? exc.message : 'Could not update role.'
  } finally {
    updatingMemberId.value = ''
  }
}

async function removeMember(member: WorkspaceMember) {
  openMenuId.value = ''
  if (!canManageWorkspace.value || member.role === 'OWNER') return
  const confirmed = window.confirm(`Remove ${member.name} from this workspace?`)
  if (!confirmed) return
  updatingMemberId.value = member.id
  memberStatus.error = ''
  memberStatus.success = ''
  try {
    await app.removeWorkspaceMember(member.id)
    memberStatus.success = 'Member removed.'
  } catch (exc) {
    memberStatus.error = exc instanceof Error ? exc.message : 'Could not remove member.'
  } finally {
    updatingMemberId.value = ''
  }
}

function toggleMenu(memberId: string) {
  openMenuId.value = openMenuId.value === memberId ? '' : memberId
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Workspace settings</h1>
        <p>Configure {{ workspace?.name ?? 'this workspace' }}.</p>
      </div>
    </header>

    <section
      v-if="accessDenied"
      class="panel empty-state"
    >
      <h3>Workspace settings are restricted</h3>
      <p>Only workspace owners and admins can manage settings and members.</p>
      <RouterLink
        class="btn"
        to="/home"
      >
        Back to home
      </RouterLink>
    </section>

    <div
      v-else
      class="settings-layout workspace-settings-layout"
    >
      <nav>
        <a href="#general">General</a>
        <a href="#members">Members</a>
        <a href="#danger">Danger zone</a>
      </nav>

      <div class="workspace-settings-content">
        <form class="panel form-stack" @submit.prevent="saveWorkspace">
          <h2 id="general">General</h2>
          <label>
            Name
            <input v-model="form.name" required />
          </label>
          <label>
            Description
            <textarea v-model="form.description" rows="4"></textarea>
          </label>
          <label>
            Visibility
            <select v-model="form.visibility">
              <option value="PRIVATE">Private</option>
              <option value="PUBLIC">Public</option>
            </select>
          </label>
          <label class="checkbox-field">
            <input v-model="form.publicContributionsEnabled" type="checkbox" />
            <span>Allow public contributions</span>
          </label>

          <p v-if="status.error" class="form-error">{{ status.error }}</p>
          <p v-if="status.success" class="form-success">{{ status.success }}</p>
          <button class="btn btn-primary align-start" :disabled="status.saving || status.archiving || !workspace">
            {{ saveLabel }}
          </button>
        </form>

        <section
          id="members"
          class="panel members-panel"
        >
          <div class="panel-header">
            <div>
              <h2>Members</h2>
              <p>Manage people, roles and workspace access.</p>
            </div>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="!workspace"
              @click="openInviteModal"
            >
              <UserPlus :size="16" />
              Invite members
            </button>
          </div>

          <div class="member-feedback">
            <p v-if="memberStatus.error" class="form-error">{{ memberStatus.error }}</p>
            <p v-if="memberStatus.success" class="form-success">{{ memberStatus.success }}</p>
          </div>

          <div class="members-table">
            <div class="table-header">
              <span>Member</span>
              <span>Role</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div
              v-for="member in app.workspaceMembers"
              :key="member.id"
              class="member-row"
            >
              <span class="person-field">
                <Avatar
                  :initials="member.initials"
                  size="sm"
                />
                <span>
                  <strong>{{ member.name }}</strong>
                  <small>{{ member.email || member.username }}</small>
                </span>
              </span>

              <select
                :value="member.role"
                :disabled="member.role === 'OWNER' || updatingMemberId === member.id"
                @change="changeRole(member, $event)"
              >
                <option
                  v-if="member.role === 'OWNER'"
                  value="OWNER"
                >
                  OWNER
                </option>
                <option
                  v-for="role in roleOptions"
                  :key="role"
                  :value="role"
                >
                  {{ role }}
                </option>
              </select>

              <StatusBadge value="Active" />

              <span class="member-actions">
                <button
                  class="btn"
                  type="button"
                  :disabled="member.role === 'OWNER'"
                  aria-label="Member actions"
                  @click="toggleMenu(member.id)"
                >
                  <MoreHorizontal :size="16" />
                </button>
                <span
                  v-if="openMenuId === member.id"
                  class="member-menu"
                >
                  <button
                    type="button"
                    @click="removeMember(member)"
                  >
                    <Trash2 :size="14" />
                    Remove
                  </button>
                </span>
              </span>
            </div>

            <div
              v-if="!app.workspaceMembers.length"
              class="empty-state compact"
            >
              <h3>No members found</h3>
              <p>This workspace does not have any loaded members.</p>
            </div>
          </div>
        </section>

        <section class="panel form-stack">
          <h2 id="danger">Danger zone</h2>
          <div class="danger-box">
            <div>
              <strong>Archive workspace</strong>
              <p>Hide the workspace without deleting its history.</p>
            </div>
            <button class="btn" type="button" :disabled="status.saving || status.archiving || !workspace" @click="archiveWorkspace">
              {{ archiveLabel }}
            </button>
          </div>
        </section>
      </div>
    </div>

    <Modal
      title="Invite member"
      :open="inviteOpen"
      @close="inviteOpen = false"
    >
      <form
        class="form-stack"
        @submit.prevent="submitInvite"
      >
        <label>
          Email
          <span class="invite-email-field">
            <input
              v-model="inviteForm.email"
              required
              type="email"
              maxlength="254"
              placeholder="teammate@example.com"
            >
            <span class="invite-candidate-list">
              <button
                v-for="candidate in filteredInviteCandidates"
                :key="candidate.auth_user_id"
                type="button"
                class="invite-candidate"
                @click="selectInviteCandidate(candidate)"
              >
                <Avatar
                  :initials="candidate.username.slice(0, 2).toUpperCase()"
                  size="sm"
                />
                <span>
                  <strong>{{ candidate.email }}</strong>
                  <small v-if="candidateSecondaryText(candidate)">{{ candidateSecondaryText(candidate) }}</small>
                </span>
              </button>
              <small
                v-if="inviteCandidateStatus"
                class="invite-candidate-status"
              >
                {{ inviteCandidateStatus }}
              </small>
            </span>
          </span>
        </label>

        <label>
          Role
          <select v-model="inviteForm.role">
            <option
              v-for="role in roleOptions"
              :key="role"
              :value="role"
            >
              {{ role }}
            </option>
          </select>
        </label>

        <p v-if="memberStatus.error" class="form-error">{{ memberStatus.error }}</p>

        <div class="modal-actions">
          <button
            class="btn"
            type="button"
            @click="inviteOpen = false"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="savingInvite"
          >
            {{ savingInvite ? 'Sending...' : 'Send invite' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<style scoped>
.checkbox-field {
  display: flex;
  grid-template-columns: none;
  align-items: center;
  gap: 8px;
}

.checkbox-field input {
  width: 16px;
  height: 16px;
  padding: 0;
}

.form-error {
  color: var(--danger);
  font-weight: 600;
  margin: 0;
}

.form-success {
  color: #216e42;
  font-weight: 600;
  margin: 0;
}

.workspace-settings-layout {
  grid-template-columns: 190px minmax(0, 980px);
}

.workspace-settings-content {
  display: grid;
  gap: 16px;
}

.members-panel {
  overflow: hidden;
}

.member-feedback {
  display: grid;
  gap: 6px;
  padding: 0 16px;
}

.empty-state.compact {
  padding: 24px 16px;
}

.invite-email-field {
  display: grid;
  gap: 6px;
}

.invite-candidate-list {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
}

.invite-candidate {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  border-bottom: 1px solid #eef1f2;
  background: #fff;
  text-align: left;
}

.invite-candidate:last-child {
  border-bottom: 0;
}

.invite-candidate:hover,
.invite-candidate:focus-visible {
  background: var(--soft);
}

.invite-candidate strong,
.invite-candidate small {
  display: block;
}

.invite-candidate small,
.invite-candidate-status {
  color: var(--muted);
}

.invite-candidate-status {
  display: block;
  padding: 10px;
  font-weight: 500;
}
</style>
