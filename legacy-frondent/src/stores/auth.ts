import { defineStore, acceptHMRUpdate } from 'pinia';
import {
  authApi,
  profilesApi,
  tokens,
  decodeUserId,
  type AuthSession,
  type Profile,
  type ProfileUpdate,
  type TwoFactorSetup,
} from '@/services/api';

interface AuthState {
  profile: Profile | null;
  sessions: AuthSession[];
  pendingTwoFactorUsername: string | null;
  pendingTwoFactorPassword: string | null;
  userId: number | null;
  loading: boolean;
  sessionsLoading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    profile: null,
    sessions: [],
    pendingTwoFactorUsername: null,
    pendingTwoFactorPassword: null,
    userId: decodeUserId(tokens.access),
    loading: false,
    sessionsLoading: false,
  }),

  getters: {
    isSignedIn: (state) => state.userId !== null,
    displayName: (state) => state.profile?.username ?? '',
    hasPendingTwoFactor: (state) =>
      Boolean(state.pendingTwoFactorUsername && state.pendingTwoFactorPassword),
  },

  actions: {
    async register(username: string, email: string, password: string) {
      await authApi.register(username, email, password);
      // Auth has no "me" endpoint, so log straight in to get a token.
      await this.login(username, password);
    },

    async login(username: string, password: string, twoFactorCode?: string) {
      const pair = await authApi.login(username, password, twoFactorCode);
      if ('two_factor_required' in pair) {
        this.pendingTwoFactorUsername = username;
        this.pendingTwoFactorPassword = password;
        return { twoFactorRequired: true };
      }

      tokens.set(pair.access, pair.refresh);
      this.userId = decodeUserId(pair.access);
      this.pendingTwoFactorUsername = null;
      this.pendingTwoFactorPassword = null;
      await this.loadProfile();
      return { twoFactorRequired: false };
    },

    async completeTwoFactor(code: string) {
      if (!this.pendingTwoFactorUsername || !this.pendingTwoFactorPassword) {
        throw new Error('Start a sign-in first.');
      }
      return this.login(this.pendingTwoFactorUsername, this.pendingTwoFactorPassword, code);
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

    async updateProfile(patch: ProfileUpdate) {
      if (!this.profile) throw new Error('Profile is not loaded.');
      this.profile = await profilesApi.update(this.profile.id, patch);
    },

    async uploadProfilePicture(file: File) {
      this.profile = await profilesApi.uploadPicture(file);
    },

    async deleteProfilePicture() {
      await profilesApi.deletePicture();
      await this.loadProfile();
    },

    async changePassword(oldPassword: string, newPassword: string) {
      await authApi.changePassword(oldPassword, newPassword);
    },

    async requestEmailVerification() {
      return authApi.requestEmailVerification();
    },

    async requestAccountActivation() {
      return authApi.requestAccountActivation();
    },

    async setupTwoFactor(): Promise<TwoFactorSetup> {
      return authApi.setupTwoFactor();
    },

    async confirmTwoFactor(code: string) {
      return authApi.confirmTwoFactor(code);
    },

    async disableTwoFactor(code: string) {
      return authApi.disableTwoFactor(code);
    },

    async loadSessions() {
      if (!this.isSignedIn) return;
      this.sessionsLoading = true;
      try {
        this.sessions = await authApi.sessions();
      } finally {
        this.sessionsLoading = false;
      }
    },

    async revokeSession(id: number) {
      await authApi.revokeSession(id);
      this.sessions = this.sessions.map((session) =>
        session.id === id ? { ...session, active: false, revoked_at: new Date().toISOString() } : session,
      );
    },

    async logoutRemote() {
      const refresh = tokens.refresh;
      if (refresh) {
        try {
          await authApi.logout(refresh);
        } finally {
          this.logout();
        }
      } else {
        this.logout();
      }
    },

    async logoutEverywhere() {
      try {
        await authApi.logoutAll();
      } finally {
        this.logout();
      }
    },

    logout() {
      tokens.clear();
      this.profile = null;
      this.sessions = [];
      this.pendingTwoFactorUsername = null;
      this.pendingTwoFactorPassword = null;
      this.userId = null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
