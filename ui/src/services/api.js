const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:8080';
export const API_BASES = {
    auth: `${GATEWAY}/api/auth`,
    profiles: `${GATEWAY}/api/profiles`,
    workspaces: `${GATEWAY}/api/workspaces`,
    projects: `${GATEWAY}/api/projects`,
    tasks: `${GATEWAY}/api/tasks`,
    attachments: `${GATEWAY}/api/attachments`,
    notifications: `${GATEWAY}/api/notifications`,
    search: `${GATEWAY}/api/search`,
};
const ACCESS_KEY = 'flowforge_access';
const REFRESH_KEY = 'flowforge_refresh';
export const tokens = {
    get access() {
        return localStorage.getItem(ACCESS_KEY);
    },
    get refresh() {
        return localStorage.getItem(REFRESH_KEY);
    },
    set(access, refresh) {
        localStorage.setItem(ACCESS_KEY, access);
        if (refresh)
            localStorage.setItem(REFRESH_KEY, refresh);
    },
    clear() {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    },
};
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: status
        });
        this.name = 'ApiError';
    }
}
export function decodeUserId(access = tokens.access) {
    if (!access)
        return null;
    try {
        const payload = JSON.parse(atob(access.split('.')[1] ?? ''));
        const id = Number(payload.user_id);
        return Number.isFinite(id) ? id : null;
    }
    catch {
        return null;
    }
}
export function notificationWebSocketUrl() {
    if (!tokens.access)
        return null;
    const url = new URL('/ws/notifications', GATEWAY);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('access_token', tokens.access);
    return url.toString();
}
function buildUrl(base, params) {
    const url = new URL(base);
    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '')
            url.searchParams.set(key, String(value));
    });
    return url.toString();
}
async function refreshAccess() {
    if (!tokens.refresh)
        return false;
    const res = await fetch(`${API_BASES.auth}/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!res.ok)
        return false;
    const data = (await res.json());
    tokens.set(data.access);
    return true;
}
function extractMessage(status, payload) {
    if (payload && typeof payload === 'object') {
        const obj = payload;
        if (typeof obj.detail === 'string')
            return obj.detail;
        const parts = Object.entries(obj).map(([field, val]) => {
            const message = Array.isArray(val) ? val.join(' ') : String(val);
            return field === 'non_field_errors' ? message : `${field}: ${message}`;
        });
        if (parts.length)
            return parts.join(' · ');
    }
    return `Request failed (${status})`;
}
export async function request(url, options = {}, retry = true) {
    const { method = 'GET', body, auth = true, headers = {} } = options;
    const isFormData = body instanceof FormData;
    const finalHeaders = { ...headers };
    if (body !== undefined && !isFormData)
        finalHeaders['Content-Type'] = 'application/json';
    if (auth && tokens.access)
        finalHeaders.Authorization = `Bearer ${tokens.access}`;
    const res = await fetch(url, {
        method,
        headers: finalHeaders,
        ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    });
    if (res.status === 401 && auth && retry && tokens.refresh && (await refreshAccess())) {
        return request(url, options, false);
    }
    if (res.status === 204)
        return undefined;
    const text = await res.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        }
        catch {
            payload = text;
        }
    }
    if (!res.ok)
        throw new ApiError(res.status, extractMessage(res.status, payload));
    return payload;
}
export const authApi = {
    register(username, email, password) {
        return request(`${API_BASES.auth}/register/`, {
            method: 'POST',
            body: { username, email, password },
            auth: false,
        });
    },
    login(username, password, two_factor_code) {
        return request(`${API_BASES.auth}/login/`, {
            method: 'POST',
            body: { username, password, two_factor_code },
            auth: false,
        });
    },
    logout(refresh) {
        return request(`${API_BASES.auth}/logout/`, { method: 'POST', body: { refresh } });
    },
    logoutAll() {
        return request(`${API_BASES.auth}/logout-all/`, { method: 'POST' });
    },
    sessions() {
        return request(`${API_BASES.auth}/sessions/`);
    },
    revokeSession(id) {
        return request(`${API_BASES.auth}/sessions/${id}/`, { method: 'DELETE' });
    },
    changePassword(old_password, new_password) {
        return request(`${API_BASES.auth}/password/change/`, {
            method: 'POST',
            body: { old_password, new_password },
        });
    },
};
export const profilesApi = {
    async me() {
        const profiles = await request(`${API_BASES.profiles}/`);
        return profiles[0] ?? null;
    },
    update(id, patch) {
        return request(`${API_BASES.profiles}/${id}/`, { method: 'PATCH', body: patch });
    },
    uploadPicture(file) {
        const body = new FormData();
        body.append('file', file);
        return request(`${API_BASES.profiles}/picture/`, { method: 'POST', body });
    },
    deletePicture() {
        return request(`${API_BASES.profiles}/picture/`, { method: 'DELETE' });
    },
};
export const workspacesApi = {
    list() {
        return request(`${API_BASES.workspaces}/`);
    },
    create(input) {
        return request(`${API_BASES.workspaces}/`, { method: 'POST', body: input });
    },
    update(id, input) {
        return request(`${API_BASES.workspaces}/${id}`, { method: 'PATCH', body: input });
    },
    archive(id) {
        return request(`${API_BASES.workspaces}/${id}/archive`, { method: 'POST' });
    },
};
export const projectsApi = {
    list(workspaceId) {
        return request(buildUrl(`${API_BASES.projects}/`, { workspace_id: workspaceId }));
    },
    get(id) {
        return request(`${API_BASES.projects}/${id}`);
    },
    create(input) {
        return request(`${API_BASES.projects}/`, { method: 'POST', body: input });
    },
    update(id, input) {
        return request(`${API_BASES.projects}/${id}`, { method: 'PATCH', body: input });
    },
    archive(id) {
        return request(`${API_BASES.projects}/${id}/archive`, { method: 'POST' });
    },
};
export const tasksApi = {
    list(params) {
        return request(buildUrl(`${API_BASES.tasks}/`, params));
    },
    get(id) {
        return request(`${API_BASES.tasks}/${id}`);
    },
    create(input) {
        return request(`${API_BASES.tasks}/`, { method: 'POST', body: input });
    },
    update(id, input) {
        return request(`${API_BASES.tasks}/${id}`, { method: 'PATCH', body: input });
    },
    complete(id) {
        return request(`${API_BASES.tasks}/${id}/complete`, { method: 'POST' });
    },
    archive(id) {
        return request(`${API_BASES.tasks}/${id}/archive`, { method: 'POST' });
    },
    remove(id) {
        return request(`${API_BASES.tasks}/${id}`, { method: 'DELETE' });
    },
    statuses() {
        return request(`${API_BASES.tasks}/statuses`);
    },
    columns() {
        return request(`${API_BASES.tasks}/kanban-columns`);
    },
    comments(taskId) {
        return request(`${API_BASES.tasks}/${taskId}/comments`);
    },
    createComment(taskId, body) {
        return request(`${API_BASES.tasks}/${taskId}/comments`, { method: 'POST', body: { body } });
    },
};
export const attachmentsApi = {
    listTask(taskId) {
        return request(`${API_BASES.attachments}/tasks/${taskId}`);
    },
    uploadTask(taskId, file) {
        const body = new FormData();
        body.append('file', file);
        return request(`${API_BASES.attachments}/tasks/${taskId}`, { method: 'POST', body });
    },
    downloadLink(id) {
        return request(`${API_BASES.attachments}/${id}/download-link`, { method: 'POST' });
    },
    remove(id) {
        return request(`${API_BASES.attachments}/${id}`, { method: 'DELETE' });
    },
};
export const notificationsApi = {
    list(page = 0, size = 20) {
        return request(buildUrl(API_BASES.notifications, { page, size }));
    },
    unreadCount() {
        return request(`${API_BASES.notifications}/unread-count`);
    },
    markRead(id) {
        return request(`${API_BASES.notifications}/${id}/read`, { method: 'PATCH' });
    },
    markAllRead() {
        return request(`${API_BASES.notifications}/read-all`, { method: 'PATCH' });
    },
    remove(id) {
        return request(`${API_BASES.notifications}/${id}`, { method: 'DELETE' });
    },
};
export const searchApi = {
    global(q, type) {
        return request(buildUrl(API_BASES.search, { q, type }));
    },
};
