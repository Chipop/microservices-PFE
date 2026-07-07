/**
 * Cross-service API client for the TODO microservice platform.
 *
 *   Auth      (8002)  register / login (JWT) / refresh
 *   Todos     (8003)  JWT-scoped CRUD
 *   Profiles  (8001)  JWT-scoped read of the caller's own profile
 *
 * One thin `fetch` wrapper injects the access token, transparently refreshes it
 * once on a 401, and surfaces a readable `ApiError` to the UI layer.
 */

const ENV = import.meta.env;

// Everything goes through the single API gateway origin (nginx on :8080),
// which routes by prefix to the auth / users / todos services.
const GATEWAY = (ENV.VITE_GATEWAY_URL as string) ?? 'http://localhost:8080';

export const AUTH_BASE = `${GATEWAY}/api/auth`;
export const TODOS_BASE = `${GATEWAY}/api/todos`;
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

export interface Todo {
  id: number;
  title: string;
  done: boolean;
  created_at: string;
}

export interface Profile {
  id: number;
  auth_user_id: number;
  username: string;
  email: string;
  created_at: string;
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
  body?: unknown;
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

  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (auth && tokens.access) finalHeaders['Authorization'] = `Bearer ${tokens.access}`;

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
  login(username: string, password: string) {
    return request<TokenPair>(
      `${AUTH_BASE}/login/`,
      { method: 'POST', body: { username, password }, auth: false },
    );
  },
};

// ---------------------------------------------------------------------------
// Todos service (8003) — JWT-scoped CRUD
// ---------------------------------------------------------------------------
export const todosApi = {
  list() {
    return request<Todo[]>(`${TODOS_BASE}/`);
  },
  create(title: string) {
    return request<Todo>(`${TODOS_BASE}/`, { method: 'POST', body: { title } });
  },
  update(id: number, patch: Partial<Pick<Todo, 'title' | 'done'>>) {
    return request<Todo>(`${TODOS_BASE}/${id}/`, { method: 'PATCH', body: patch });
  },
  remove(id: number) {
    return request<void>(`${TODOS_BASE}/${id}/`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Profiles service (8001) — the caller only ever sees their own profile
// ---------------------------------------------------------------------------
export const profilesApi = {
  me() {
    return request<Profile[]>(`${PROFILES_BASE}/`).then((list) => list[0] ?? null);
  },
};
