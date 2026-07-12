<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useWorkspacesStore } from '@/stores/workspaces';
import type { WorkspaceRole } from '@/services/api';
import { formatDate } from '@/utils/format';

const workspaces = useWorkspacesStore();
const createOpen = shallowRef(false);
const inviteToken = shallowRef('');
const createForm = reactive<{
  name: string;
  description: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  publicContributionsEnabled: boolean;
}>({ name: '', description: '', visibility: 'PRIVATE', publicContributionsEnabled: false });
const inviteForm = reactive<{ email: string; role: WorkspaceRole }>({ email: '', role: 'MEMBER' });
const roleOptions: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

const selected = computed(() => workspaces.current);

onMounted(async () => {
  await workspaces.hydrate();
  if (workspaces.current) await workspaces.select(workspaces.current.id);
});

async function createWorkspace() {
  const workspace = await workspaces.create(createForm);
  Object.assign(createForm, { name: '', description: '', visibility: 'PRIVATE', publicContributionsEnabled: false });
  createOpen.value = false;
  await workspaces.select(workspace.id);
}

async function invite() {
  const invitation = await workspaces.invite(inviteForm.email, inviteForm.role);
  inviteToken.value = invitation.token ?? '';
  inviteForm.email = '';
  inviteForm.role = 'MEMBER';
}
</script>

<template>
  <q-page class="ff-page workspaces-page">
    <header class="page-head">
      <div>
        <h1>Workspaces</h1>
        <p>Manage shared task spaces, roles, invitations, and contribution boundaries.</p>
      </div>
      <q-btn color="primary" icon="add_business" label="New workspace" no-caps @click="createOpen = true" />
    </header>

    <section class="workspace-layout">
      <aside class="workspace-list ff-card">
        <q-list v-if="workspaces.activeWorkspaces.length" separator>
          <q-item
            v-for="workspace in workspaces.activeWorkspaces"
            :key="workspace.id"
            clickable
            :active="selected?.id === workspace.id"
            active-class="active-workspace"
            @click="workspaces.select(workspace.id)"
          >
            <q-item-section avatar>
              <q-icon :name="workspace.workspaceType === 'PERSONAL' ? 'person' : 'hub'" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="workspace-name">{{ workspace.name }}</q-item-label>
              <q-item-label caption>{{ workspace.currentUserRole ?? 'Viewer' }} · {{ workspace.visibility }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <EmptyState v-else icon="hub" title="No workspaces" message="Create a team workspace or wait for the registration workflow to create your personal space." />
      </aside>

      <main class="workspace-detail ff-card">
        <template v-if="selected">
          <header class="detail-head">
            <div>
              <h2>{{ selected.name }}</h2>
              <p>{{ selected.workspaceType }} · Created {{ formatDate(selected.createdAt) }}</p>
            </div>
            <span class="ff-chip">{{ selected.currentUserRole ?? 'VIEWER' }}</span>
          </header>

          <section class="settings-grid">
            <q-input
              :model-value="selected.name"
              outlined
              label="Workspace name"
              :disable="!selected.canAdmin"
              @change="workspaces.update(selected.id, { name: String($event) })"
            />
            <q-select
              :model-value="selected.visibility"
              :options="['PRIVATE', 'PUBLIC']"
              outlined
              label="Visibility"
              :disable="!selected.canAdmin"
              @update:model-value="workspaces.update(selected.id, { visibility: $event })"
            />
            <q-input
              class="settings-description"
              :model-value="selected.description"
              outlined
              autogrow
              label="Description"
              :disable="!selected.canAdmin"
              @change="workspaces.update(selected.id, { description: String($event) })"
            />
            <q-toggle
              :model-value="selected.publicContributionsEnabled"
              label="Allow public contributions"
              :disable="!selected.canAdmin"
              @update:model-value="workspaces.update(selected.id, { publicContributionsEnabled: Boolean($event) })"
            />
          </section>

          <section v-if="selected.canAdmin" class="admin-grid">
            <article>
              <h3>Members</h3>
              <q-list bordered separator>
                <q-item v-for="member in workspaces.members" :key="member.id">
                  <q-item-section>
                    <q-item-label>User {{ member.userId }}</q-item-label>
                    <q-item-label caption>Joined {{ formatDate(member.joinedAt) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-select
                      :model-value="member.role"
                      :options="roleOptions"
                      dense
                      outlined
                      style="width: 130px"
                      @update:model-value="workspaces.changeRole(member.userId, $event)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </article>

            <article>
              <h3>Invitations</h3>
              <div class="invite-form">
                <q-input v-model="inviteForm.email" outlined dense label="Email" />
                <q-select v-model="inviteForm.role" :options="roleOptions.filter((role) => role !== 'OWNER')" outlined dense label="Role" />
                <q-btn color="primary" icon="outgoing_mail" label="Invite" no-caps @click="invite" />
              </div>
              <q-banner v-if="inviteToken" rounded class="token-banner">
                Invitation token: <strong>{{ inviteToken }}</strong>
              </q-banner>
              <q-list bordered separator>
                <q-item v-for="invitation in workspaces.invitations" :key="invitation.id">
                  <q-item-section>
                    <q-item-label>{{ invitation.invitedEmail }}</q-item-label>
                    <q-item-label caption>{{ invitation.role }} · {{ invitation.status }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </article>
          </section>
        </template>
        <EmptyState v-else icon="ads_click" title="Select a workspace" message="Workspace details, members, and invitations appear here." />
      </main>
    </section>

    <q-dialog v-model="createOpen">
      <q-card class="workspace-dialog">
        <q-card-section><h2 class="ff-section-title">Create workspace</h2></q-card-section>
        <q-card-section class="dialog-form">
          <q-input v-model="createForm.name" outlined label="Name" />
          <q-input v-model="createForm.description" outlined autogrow label="Description" />
          <q-select v-model="createForm.visibility" :options="['PRIVATE', 'PUBLIC']" outlined label="Visibility" />
          <q-toggle v-model="createForm.publicContributionsEnabled" label="Allow public contributions" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn color="primary" no-caps label="Create" :disable="!createForm.name" @click="createWorkspace" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.workspaces-page {
  display: grid;
  gap: 18px;
}

.page-head,
.detail-head,
.invite-form {
  display: flex;
  gap: 12px;
}

.page-head,
.detail-head {
  align-items: end;
  justify-content: space-between;
}

.page-head h1 {
  margin: 0 0 6px;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 880;
}

.page-head p,
.detail-head p {
  margin: 0;
  color: var(--ff-muted);
}

.workspace-layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 18px;
}

.workspace-list,
.workspace-detail {
  padding: 16px;
}

.workspace-name,
.detail-head h2,
.admin-grid h3 {
  margin: 0;
  font-weight: 820;
}

.active-workspace {
  background: rgba(8, 174, 183, 0.12);
  color: var(--ff-ink);
}

.settings-grid,
.admin-grid,
.dialog-form {
  display: grid;
  gap: 14px;
}

.settings-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 20px;
}

.settings-description {
  grid-column: 1 / -1;
}

.admin-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 24px;
}

.invite-form {
  align-items: center;
  margin: 10px 0;
}

.invite-form .q-field {
  flex: 1;
}

.token-banner {
  margin-bottom: 10px;
  background: rgba(247, 185, 20, 0.16);
}

.workspace-dialog {
  width: min(560px, calc(100vw - 28px));
}

@media (max-width: 1000px) {
  .workspace-layout,
  .settings-grid,
  .admin-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .page-head,
  .detail-head,
  .invite-form {
    display: grid;
  }
}
</style>
