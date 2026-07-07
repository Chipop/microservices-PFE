import { defineStore, acceptHMRUpdate } from 'pinia';
import { authApi, profilesApi, tokens, decodeUserId, type Profile } from '@/services/api';

interface AuthState {
  profile: Profile | null;
  userId: number | null;
  loading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    profile: null,
    userId: decodeUserId(tokens.access),
    loading: false,
  }),

  getters: {
    isSignedIn: (state) => state.userId !== null,
    displayName: (state) => state.profile?.username ?? '',
  },

  actions: {
    async register(username: string, email: string, password: string) {
      await authApi.register(username, email, password);
      // Auth has no "me" endpoint, so log straight in to get a token.
      await this.login(username, password);
    },

    async login(username: string, password: string) {
      const pair = await authApi.login(username, password);
      tokens.set(pair.access, pair.refresh);
      this.userId = decodeUserId(pair.access);
      await this.loadProfile();
    },

    async loadProfile() {
      if (!this.isSignedIn) return;
      this.loading = true;
      try {
        this.profile = await profilesApi.me();
      } finally {
        this.loading = false;
      }
    },

    logout() {
      tokens.clear();
      this.profile = null;
      this.userId = null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
