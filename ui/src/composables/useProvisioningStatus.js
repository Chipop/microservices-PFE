import { computed, shallowRef } from 'vue';
import { workspaceRepository } from '@/data/repositories';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_INTERVAL_MS = 1200;
export function useProvisioningStatus(options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const state = shallowRef('idle');
    const detail = shallowRef('Creating your profile and private workspace.');
    const error = shallowRef('');
    const startedAt = shallowRef(null);
    const auth = useAuthStore();
    const app = useAppStore();
    const elapsedSeconds = computed(() => {
        if (!startedAt.value)
            return 0;
        return Math.floor((Date.now() - startedAt.value) / 1000);
    });
    async function waitUntilReady() {
        startedAt.value = Date.now();
        state.value = 'checking';
        error.value = '';
        while (Date.now() - startedAt.value < timeoutMs) {
            try {
                detail.value = 'Checking your profile.';
                const profile = await auth.loadProfile();
                detail.value = 'Checking your personal workspace.';
                const workspaces = await workspaceRepository.list();
                const personalWorkspace = workspaces.find(workspace => workspace.workspaceType === 'PERSONAL');
                if (profile && personalWorkspace) {
                    app.setWorkspaceSelection(workspaces, personalWorkspace.id);
                    state.value = 'ready';
                    detail.value = 'Workspace ready.';
                    return personalWorkspace;
                }
            }
            catch (exc) {
                error.value = exc instanceof Error ? exc.message : 'Provisioning check failed.';
            }
            await delay(intervalMs);
        }
        state.value = 'failed';
        if (!error.value) {
            error.value = 'Provisioning is taking longer than expected.';
        }
        return null;
    }
    function retry() {
        return waitUntilReady();
    }
    return {
        state,
        detail,
        error,
        elapsedSeconds,
        waitUntilReady,
        retry,
    };
}
function delay(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}
