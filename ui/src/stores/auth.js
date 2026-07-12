import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi, decodeUserId, profilesApi, tokens } from '@/services/api';
import { profileToUser } from '@/services/mappers';
export const useAuthStore = defineStore('auth', () => {
    const profile = ref(null);
    const sessions = ref([]);
    const userId = ref(decodeUserId());
    const loading = ref(false);
    const sessionsLoading = ref(false);
    const error = ref('');
    const isSignedIn = computed(() => userId.value !== null && Boolean(tokens.access));
    const currentUser = computed(() => profileToUser(profile.value, userId.value));
    async function initialize() {
        if (!isSignedIn.value || profile.value)
            return;
        await loadProfile();
    }
    async function register(username, email, password) {
        loading.value = true;
        error.value = '';
        try {
            await authApi.register(username, email, password);
            await login(username, password);
        }
        catch (exc) {
            error.value = exc instanceof Error ? exc.message : 'Registration failed';
            throw exc;
        }
        finally {
            loading.value = false;
        }
    }
    async function login(username, password, twoFactorCode) {
        loading.value = true;
        error.value = '';
        try {
            const result = await authApi.login(username, password, twoFactorCode);
            if ('two_factor_required' in result) {
                error.value = 'Two-factor authentication is required.';
                return { twoFactorRequired: true };
            }
            tokens.set(result.access, result.refresh);
            userId.value = decodeUserId(result.access);
            await loadProfile();
            return { twoFactorRequired: false };
        }
        catch (exc) {
            error.value = exc instanceof Error ? exc.message : 'Login failed';
            throw exc;
        }
        finally {
            loading.value = false;
        }
    }
    async function loadProfile() {
        if (!isSignedIn.value)
            return;
        loading.value = true;
        try {
            profile.value = await profilesApi.me();
            return profile.value;
        }
        finally {
            loading.value = false;
        }
    }
    async function updateProfile(patch) {
        if (!profile.value)
            throw new Error('Profile is not loaded.');
        profile.value = await profilesApi.update(profile.value.id, patch);
    }
    async function loadSessions() {
        if (!isSignedIn.value)
            return;
        sessionsLoading.value = true;
        try {
            sessions.value = await authApi.sessions();
        }
        finally {
            sessionsLoading.value = false;
        }
    }
    async function logoutRemote() {
        const refresh = tokens.refresh;
        try {
            if (refresh)
                await authApi.logout(refresh);
        }
        finally {
            logout();
        }
    }
    function logout() {
        tokens.clear();
        userId.value = null;
        profile.value = null;
        sessions.value = [];
        error.value = '';
    }
    return {
        profile,
        sessions,
        userId,
        loading,
        sessionsLoading,
        error,
        isSignedIn,
        currentUser,
        initialize,
        register,
        login,
        loadProfile,
        updateProfile,
        loadSessions,
        logoutRemote,
        logout,
    };
});
