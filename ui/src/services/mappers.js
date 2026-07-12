export function initials(nameOrEmail) {
    const parts = nameOrEmail.trim().split(/[\s._-]+/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}
export function profileToUser(profile, fallbackId) {
    const username = profile?.username ?? (fallbackId ? `user-${fallbackId}` : 'user');
    return {
        id: String(profile?.auth_user_id ?? fallbackId ?? ''),
        name: username,
        username,
        email: profile?.email ?? '',
        initials: initials(username),
        avatar: profile?.profile_picture_url ?? undefined,
    };
}
export function workspaceToView(dto) {
    return {
        id: String(dto.id),
        name: dto.name,
        key: dto.name.slice(0, 2).toUpperCase(),
        description: dto.description ?? '',
        memberCount: 1,
        role: dto.currentUserRole,
    };
}
export function projectToView(dto, lead) {
    return {
        id: String(dto.id),
        workspaceId: String(dto.workspace_id),
        key: projectKey(dto.name, dto.id),
        name: dto.name,
        description: dto.description ?? '',
        color: colorFromId(dto.id),
        lead,
        favorite: false,
        updatedAt: formatDate(dto.updated_at),
        taskCount: 0,
        completedCount: 0,
    };
}
export function taskToView(dto, currentUser) {
    const assignee = dto.assignments[0]?.assignee_user_id;
    return {
        id: String(dto.id),
        key: taskKey(dto.project_id, dto.id),
        workspaceId: String(dto.workspace_id ?? ''),
        projectId: String(dto.project_id ?? ''),
        title: dto.title,
        description: dto.description ?? '',
        status: statusToView(dto),
        priority: priorityToView(dto.priority),
        assignee: assignee ? userStub(assignee) : undefined,
        reporter: dto.author_user_id === Number(currentUser.id) ? currentUser : userStub(dto.author_user_id),
        dueDate: dto.due_at?.slice(0, 10),
        tags: dto.tags.map(tag => tag.name),
        subtasks: dto.subtasks.map(subtask => ({ id: String(subtask.id), title: subtask.title, done: subtask.done })),
        dependencies: dto.dependencies.map(dependency => String(dependency.depends_on_task_id)),
        reminders: dto.reminders.map(reminder => reminder.remind_at),
        attachments: [],
        comments: [],
        updatedAt: formatDate(dto.updated_at),
        createdAt: formatDate(dto.created_at),
    };
}
export function commentToView(dto, currentUser) {
    return {
        id: String(dto.id),
        author: dto.author_user_id === Number(currentUser.id) ? currentUser : userStub(dto.author_user_id),
        body: dto.body,
        createdAt: formatDate(dto.created_at),
    };
}
export function attachmentToView(dto) {
    return {
        id: String(dto.id),
        name: dto.originalFilename,
        size: formatBytes(dto.sizeBytes),
    };
}
export function notificationToView(dto) {
    return {
        id: String(dto.id),
        type: dto.type,
        title: dto.title,
        message: dto.message,
        isRead: dto.isRead,
        createdAt: formatDate(dto.createdAt),
        relatedResourceType: dto.relatedResourceType ?? undefined,
        relatedResourceId: dto.relatedResourceId === null ? undefined : String(dto.relatedResourceId),
    };
}
export function priorityToApi(priority) {
    if (priority === 'Highest')
        return 'urgent';
    if (priority === 'High')
        return 'high';
    if (priority === 'Low')
        return 'low';
    return 'normal';
}
export function priorityToView(priority) {
    if (priority === 'urgent')
        return 'Highest';
    if (priority === 'high')
        return 'High';
    if (priority === 'low')
        return 'Low';
    return 'Medium';
}
export function statusSlug(status) {
    if (status === 'Done')
        return 'done';
    if (status === 'In progress' || status === 'Review')
        return 'in_progress';
    if (status === 'Backlog' || status === 'To do')
        return 'todo';
    return undefined;
}
function statusToView(dto) {
    const slug = dto.status?.slug;
    if (dto.done || slug === 'done')
        return 'Done';
    if (slug === 'in_progress')
        return 'In progress';
    if (slug === 'archived')
        return 'Done';
    return 'To do';
}
function userStub(id) {
    const name = `User ${id}`;
    return { id: String(id), name, username: `user-${id}`, email: '', initials: initials(name) };
}
function projectKey(name, id) {
    const letters = name.match(/[A-Za-z0-9]/g)?.join('').slice(0, 4).toUpperCase();
    return letters || `P${id}`;
}
function taskKey(projectId, id) {
    return `${projectId ? `P${projectId}` : 'TASK'}-${id}`;
}
function colorFromId(id) {
    const colors = ['#00a9ad', '#f4b400', '#34424c', '#6a8d73', '#8a5a44', '#3f6c8f'];
    return colors[id % colors.length];
}
function formatDate(value) {
    if (!value)
        return '';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
