import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { workspacesApi, type Workspace, type WorkspaceInvitation, type WorkspaceMember, type WorkspaceRole } from '@/services/api';

export const useWorkspacesStore = defineStore('workspaces', () => {
  const items = ref<Workspace[]>([]);
  const current = shallowRef<Workspace | null>(null);
  const members = ref<WorkspaceMember[]>([]);
  const invitations = ref<WorkspaceInvitation[]>([]);
  const loading = shallowRef(false);
  const detailLoading = shallowRef(false);

  const activeWorkspaces = computed(() => items.value.filter((workspace) => !workspace.archivedAt && !workspace.deletedAt));
  const teamWorkspaces = computed(() => activeWorkspaces.value.filter((workspace) => workspace.workspaceType === 'TEAM'));
  const personalWorkspace = computed(() => activeWorkspaces.value.find((workspace) => workspace.workspaceType === 'PERSONAL') ?? null);

  async function hydrate() {
    loading.value = true;
    try {
      items.value = await workspacesApi.list();
      if (!current.value && items.value.length) current.value = items.value[0] ?? null;
    } finally {
      loading.value = false;
    }
  }

  async function select(id: number) {
    detailLoading.value = true;
    try {
      const workspace = await workspacesApi.get(id);
      current.value = workspace;
      if (workspace.canAdmin) {
        const [memberRows, inviteRows] = await Promise.all([workspacesApi.members(id), workspacesApi.invitations(id)]);
        members.value = memberRows;
        invitations.value = inviteRows;
      } else {
        members.value = [];
        invitations.value = [];
      }
      replace(workspace);
    } finally {
      detailLoading.value = false;
    }
  }

  async function create(body: { name: string; description?: string; visibility?: Workspace['visibility']; publicContributionsEnabled?: boolean }) {
    const workspace = await workspacesApi.create(body);
    items.value = [workspace, ...items.value];
    current.value = workspace;
    return workspace;
  }

  async function update(id: number, body: Parameters<typeof workspacesApi.update>[1]) {
    const workspace = await workspacesApi.update(id, body);
    replace(workspace);
    if (current.value?.id === id) current.value = workspace;
  }

  async function archive(id: number) {
    const workspace = await workspacesApi.archive(id);
    replace(workspace);
  }

  async function invite(email: string, role: WorkspaceRole) {
    if (!current.value) throw new Error('Select a workspace first.');
    const invitation = await workspacesApi.invite(current.value.id, { email, role });
    invitations.value = [invitation, ...invitations.value];
    return invitation;
  }

  async function changeRole(userId: number, role: WorkspaceRole) {
    if (!current.value) throw new Error('Select a workspace first.');
    const member = await workspacesApi.changeRole(current.value.id, userId, role);
    members.value = members.value.map((item) => (item.userId === userId ? member : item));
  }

  async function removeMember(userId: number) {
    if (!current.value) throw new Error('Select a workspace first.');
    await workspacesApi.removeMember(current.value.id, userId);
    members.value = members.value.filter((item) => item.userId !== userId);
  }

  async function respondToInvitation(token: string, accept: boolean) {
    const invitation = accept ? await workspacesApi.acceptInvitation(token) : await workspacesApi.rejectInvitation(token);
    await hydrate();
    return invitation;
  }

  function replace(workspace: Workspace) {
    const index = items.value.findIndex((item) => item.id === workspace.id);
    if (index === -1) items.value = [workspace, ...items.value];
    else items.value.splice(index, 1, workspace);
  }

  function reset() {
    items.value = [];
    current.value = null;
    members.value = [];
    invitations.value = [];
  }

  return {
    items,
    current,
    members,
    invitations,
    loading,
    detailLoading,
    activeWorkspaces,
    teamWorkspaces,
    personalWorkspace,
    hydrate,
    select,
    create,
    update,
    archive,
    invite,
    changeRole,
    removeMember,
    respondToInvitation,
    reset,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWorkspacesStore, import.meta.hot));
}
