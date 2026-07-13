import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppShell from '@/components/layout/AppShell.vue';
import LoginPage from '@/pages/auth/LoginPage.vue';
import RegisterPage from '@/pages/auth/RegisterPage.vue';
import PreparingWorkspacePage from '@/pages/auth/PreparingWorkspacePage.vue';
import HomePage from '@/pages/home/HomePage.vue';
import ProjectsPage from '@/pages/projects/ProjectsPage.vue';
import NewProjectPage from '@/pages/projects/NewProjectPage.vue';
import ProjectLayout from '@/pages/projects/ProjectLayout.vue';
import ProjectOverview from '@/pages/projects/ProjectOverview.vue';
import ProjectBoard from '@/pages/projects/ProjectBoard.vue';
import ProjectList from '@/pages/projects/ProjectList.vue';
import ProjectTimeline from '@/pages/projects/ProjectTimeline.vue';
import ProjectBacklog from '@/pages/projects/ProjectBacklog.vue';
import ProjectFiles from '@/pages/projects/ProjectFiles.vue';
import ProjectSettings from '@/pages/projects/ProjectSettings.vue';
import TasksPage from '@/pages/tasks/TasksPage.vue';
import YourWorkPage from '@/pages/tasks/YourWorkPage.vue';
import TaskDetailsPage from '@/pages/tasks/TaskDetailsPage.vue';
import SearchPage from '@/pages/search/SearchPage.vue';
import NotificationsPage from '@/pages/notifications/NotificationsPage.vue';
import ProfilePage from '@/pages/profile/ProfilePage.vue';
import SecurityPage from '@/pages/settings/SecurityPage.vue';
import SessionsPage from '@/pages/settings/SessionsPage.vue';
import WorkspacesPage from '@/pages/workspaces/WorkspacesPage.vue';
import MembersPage from '@/pages/workspaces/MembersPage.vue';
import WorkspaceSettingsPage from '@/pages/workspaces/WorkspaceSettingsPage.vue';
import NotFoundPage from '@/pages/NotFoundPage.vue';
const routes = [
    { path: '/', redirect: '/home' },
    { path: '/login', component: LoginPage, meta: { guestOnly: true } }, { path: '/register', component: RegisterPage, meta: { guestOnly: true } }, { path: '/forgot-password', component: LoginPage, meta: { guestOnly: true } },
    { path: '/preparing-workspace', component: PreparingWorkspacePage, meta: { requiresAuth: true } },
    { path: '/', component: AppShell, meta: { requiresAuth: true }, children: [
            { path: 'home', component: HomePage }, { path: 'projects', component: ProjectsPage }, { path: 'projects/new', component: NewProjectPage },
            { path: 'projects/:id', component: ProjectLayout, children: [{ path: '', redirect: (to) => `/projects/${to.params.id}/overview` }, { path: 'overview', component: ProjectOverview }, { path: 'board', component: ProjectBoard }, { path: 'list', component: ProjectList }, { path: 'timeline', component: ProjectTimeline }, { path: 'backlog', component: ProjectBacklog }, { path: 'files', component: ProjectFiles }, { path: 'settings', component: ProjectSettings }] },
            { path: 'your-work', component: YourWorkPage }, { path: 'tasks', component: TasksPage }, { path: 'tasks/:id', component: TaskDetailsPage }, { path: 'search', component: SearchPage }, { path: 'notifications', component: NotificationsPage }, { path: 'profile', component: ProfilePage }, { path: 'security', component: SecurityPage }, { path: 'sessions', component: SessionsPage }, { path: 'workspaces', component: WorkspacesPage }, { path: 'members', component: MembersPage }, { path: 'workspace/settings', component: WorkspaceSettingsPage }
        ] }, { path: '/:pathMatch(.*)*', component: NotFoundPage }
];
const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) });
router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (to.path === '/tasks' && to.query.assigned === 'me')
        return '/your-work';
    if (auth.isSignedIn && !auth.profile) {
        try {
            await auth.initialize();
        }
        catch {
            auth.logout();
        }
    }
    if (to.meta.requiresAuth && !auth.isSignedIn)
        return { path: '/login', query: { redirect: to.fullPath } };
    if (to.meta.guestOnly && auth.isSignedIn)
        return '/home';
    return true;
});
export default router;
