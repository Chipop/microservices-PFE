/**
 * Cross-service API client for the task microservice platform.
 *
 *   Auth      (8002)  register / login (JWT) / refresh / security workflows
 *   Tasks     (8003)  JWT-scoped task management
 *   Profiles  (8001)  JWT-scoped profile metadata and profile picture storage
 *
 * One thin `fetch` wrapper injects the access token, transparently refreshes it
 * once on a 401, and surfaces a readable `ApiError` to the UI layer.
 */

const ENV = import.meta.env;

// Everything goes through the single API gateway origin (nginx on :8080),
// which routes by prefix to the auth / users / tasks services.
const GATEWAY = (ENV.VITE_GATEWAY_URL as string) ?? 'http://localhost:8080';

export const AUTH_BASE = `${GATEWAY}/api/auth`;
export const TASKS_BASE = `${GATEWAY}/api/tasks`;
export const PROFILES_BASE = `${GATEWAY}/api/profiles`;

const ACCESS_KEY = 'todo_access';
const REFRESH_KEY = 'todo_refresh';

// ---------------------------------------------------------------------------
// Token storage — single source of truth, mirrored in localStorage so a reload
// keeps the session.
// ---------------------------------------------------------------------------
export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ---------------------------------------------------------------------------
// Types — mirror the DRF serializers.
// ---------------------------------------------------------------------------
export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface TwoFactorRequired {
  detail: 'two_factor_required';
  two_factor_required: true;
}

export interface MessageResponse {
  detail: string;
  token?: string;
}

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
}

export interface TwoFactorStatus {
  two_factor_enabled: boolean;
}

export interface AuthSession {
  id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  active: boolean;
}

export interface TaskStatusSummary {
  id: number;
  name: string;
  slug: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  done: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  status: TaskStatusSummary | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  auth_user_id: number;
  username: string;
  email: string;
  profile_picture_url: string | null;
  biography: string;
  timezone: string;
  language: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<Pick<Profile, 'username' | 'biography' | 'timezone' | 'language'>> & {
  preferences?: Record<string, unknown>;
};

export interface PublicProfile {
  username: string;
  biography: string;
  timezone: string;
  language: string;
  profile_picture_url: string | null;
  joined_date: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Decode the `user_id` claim from the JWT payload without a library.
// SimpleJWT may serialise the claim as a string ("51") or a number (51),
// so we accept both and normalise to a number.
export function decodeUserId(access: string | null): number | null {
  if (!access) return null;
  try {
    const payload = JSON.parse(atob(access.split('.')[1] ?? ''));
    const id = Number(payload.user_id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core request wrapper.
// ---------------------------------------------------------------------------
interface RequestOptions {
  method?: string;
  body?: unknown | FormData;
  auth?: boolean; // attach the access token (default: true)
  headers?: Record<string, string>;
}

async function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  const res = await fetch(`${AUTH_BASE}/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { access: string };
  tokens.set(data.access);
  return true;
}

function extractMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    // DRF field errors: { field: ["msg", ...] }
    const parts: string[] = [];
    for (const [field, val] of Object.entries(obj)) {
      const msg = Array.isArray(val) ? val.join(' ') : String(val);
      parts.push(field === 'non_field_errors' ? msg : `${field}: ${msg}`);
    }
    if (parts.length) return parts.join(' · ');
  }
  return `Request failed (${status})`;
}

async function request<T>(url: string, opts: RequestOptions = {}, retry = true): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = opts;
  const isFormData = body instanceof FormData;

  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined && !isFormData) finalHeaders['Content-Type'] = 'application/json';
  if (auth && tokens.access) finalHeaders['Authorization'] = `Bearer ${tokens.access}`;

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  // Transparent one-shot refresh on an expired/invalid access token.
  if (res.status === 401 && auth && retry && tokens.refresh) {
    if (await refreshAccess()) {
      return request<T>(url, opts, false);
    }
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(res.status, payload));
  }
  return payload as T;
}

// ---------------------------------------------------------------------------
// Auth service (8002)
// ---------------------------------------------------------------------------
export const authApi = {
  register(username: string, email: string, password: string) {
    return request<AuthUser>(
      `${AUTH_BASE}/register/`,
      { method: 'POST', body: { username, email, password }, auth: false },
    );
  },
  login(username: string, password: string, two_factor_code?: string) {
    return request<TokenPair | TwoFactorRequired>(
      `${AUTH_BASE}/login/`,
      { method: 'POST', body: { username, password, two_factor_code }, auth: false },
    );
  },
  refresh(refresh: string) {
    return request<{ access: string }>(
      `${AUTH_BASE}/refresh/`,
      { method: 'POST', body: { refresh }, auth: false },
    );
  },
  verify(access: string) {
    return request<Record<string, never>>(
      `${AUTH_BASE}/verify/`,
      { method: 'POST', body: { token: access }, auth: false },
    );
  },
  logout(refresh: string) {
    return request<void>(`${AUTH_BASE}/logout/`, { method: 'POST', body: { refresh } });
  },
  logoutAll() {
    return request<void>(`${AUTH_BASE}/logout-all/`, { method: 'POST' });
  },
  changePassword(old_password: string, new_password: string) {
    return request<void>(
      `${AUTH_BASE}/password/change/`,
      { method: 'POST', body: { old_password, new_password } },
    );
  },
  forgotPassword(email: string) {
    return request<MessageResponse>(
      `${AUTH_BASE}/password/forgot/`,
      { method: 'POST', body: { email }, auth: false },
    );
  },
  resetPassword(token: string, new_password: string) {
    return request<void>(
      `${AUTH_BASE}/password/reset/confirm/`,
      { method: 'POST', body: { token, new_password }, auth: false },
    );
  },
  requestEmailVerification() {
    return request<MessageResponse>(
      `${AUTH_BASE}/email/verify/request/`,
      { method: 'POST' },
    );
  },
  confirmEmailVerification(token: string) {
    return request<void>(
      `${AUTH_BASE}/email/verify/confirm/`,
      { method: 'POST', body: { token }, auth: false },
    );
  },
  requestAccountActivation() {
    return request<MessageResponse>(
      `${AUTH_BASE}/activation/request/`,
      { method: 'POST' },
    );
  },
  confirmAccountActivation(token: string) {
    return request<void>(
      `${AUTH_BASE}/activation/confirm/`,
      { method: 'POST', body: { token }, auth: false },
    );
  },
  setupTwoFactor() {
    return request<TwoFactorSetup>(`${AUTH_BASE}/2fa/setup/`, { method: 'POST' });
  },
  confirmTwoFactor(code: string) {
    return request<TwoFactorStatus>(`${AUTH_BASE}/2fa/confirm/`, { method: 'POST', body: { code } });
  },
  disableTwoFactor(code: string) {
    return request<TwoFactorStatus>(`${AUTH_BASE}/2fa/disable/`, { method: 'POST', body: { code } });
  },
  sessions() {
    return request<AuthSession[]>(`${AUTH_BASE}/sessions/`);
  },
  revokeSession(id: number) {
    return request<void>(`${AUTH_BASE}/sessions/${id}/`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Tasks service (8003) — JWT-scoped task management
// ---------------------------------------------------------------------------
export const tasksApi = {
  list() {
    return request<Task[]>(`${TASKS_BASE}/`);
  },
  create(title: string) {
    return request<Task>(`${TASKS_BASE}/`, { method: 'POST', body: { title } });
  },
  update(id: number, patch: Partial<Pick<Task, 'title' | 'description' | 'done' | 'priority' | 'due_at'>>) {
    return request<Task>(`${TASKS_BASE}/${id}/`, { method: 'PATCH', body: patch });
  },
  complete(id: number) {
    return request<Task>(`${TASKS_BASE}/${id}/complete`, { method: 'POST' });
  },
  archive(id: number) {
    return request<Task>(`${TASKS_BASE}/${id}/archive`, { method: 'POST' });
  },
  remove(id: number) {
    return request<void>(`${TASKS_BASE}/${id}/`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Profiles service (8001) — the caller only ever sees their own profile
// ---------------------------------------------------------------------------
export const profilesApi = {
  me() {
    return request<Profile[]>(`${PROFILES_BASE}/`).then((list) => list[0] ?? null);
  },
  update(id: number, patch: ProfileUpdate) {
    return request<Profile>(`${PROFILES_BASE}/${id}/`, { method: 'PATCH', body: patch });
  },
  public(username: string) {
    return request<PublicProfile>(
      `${PROFILES_BASE}/public/${encodeURIComponent(username)}/`,
      { auth: false },
    );
  },
  uploadPicture(file: File) {
    const body = new FormData();
    body.append('file', file);
    return request<Profile>(`${PROFILES_BASE}/picture/`, { method: 'POST', body });
  },
  replacePicture(file: File) {
    const body = new FormData();
    body.append('file', file);
    return request<Profile>(`${PROFILES_BASE}/picture/`, { method: 'PUT', body });
  },
  deletePicture() {
    return request<void>(`${PROFILES_BASE}/picture/`, { method: 'DELETE' });
  },
};
