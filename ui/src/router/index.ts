import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/components/layout/AppShell.vue'
import LoginPage from '@/pages/auth/LoginPage.vue'
import RegisterPage from '@/pages/auth/RegisterPage.vue'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage.vue'
import PreparingWorkspacePage from '@/pages/auth/PreparingWorkspacePage.vue'
import HomePage from '@/pages/home/HomePage.vue'
import CategoriesPage from '@/pages/categories/CategoriesPage.vue'
import NewCategoryPage from '@/pages/categories/NewCategoryPage.vue'
import CategoryLayout from '@/pages/categories/CategoryLayout.vue'
import CategoryOverview from '@/pages/categories/CategoryOverview.vue'
import CategoryBoard from '@/pages/categories/CategoryBoard.vue'
import CategoryList from '@/pages/categories/CategoryList.vue'
import CategoryTimeline from '@/pages/categories/CategoryTimeline.vue'
import CategoryBacklog from '@/pages/categories/CategoryBacklog.vue'
import CategoryFiles from '@/pages/categories/CategoryFiles.vue'
import CategorySettings from '@/pages/categories/CategorySettings.vue'
import YourWorkPage from '@/pages/tasks/YourWorkPage.vue'
import TaskDetailsPage from '@/pages/tasks/TaskDetailsPage.vue'
import NotificationsPage from '@/pages/notifications/NotificationsPage.vue'
import ProfilePage from '@/pages/profile/ProfilePage.vue'
import SecurityPage from '@/pages/settings/SecurityPage.vue'
import SessionsPage from '@/pages/settings/SessionsPage.vue'
import WorkspacesPage from '@/pages/workspaces/WorkspacesPage.vue'
import WorkspaceSettingsPage from '@/pages/workspaces/WorkspaceSettingsPage.vue'
import StatisticsPage from '@/pages/statistics/StatisticsPage.vue'
import NotFoundPage from '@/pages/NotFoundPage.vue'

const routes=[
  {path:'/',redirect:'/home'},
  {path:'/login',component:LoginPage,meta:{guestOnly:true}},{path:'/register',component:RegisterPage,meta:{guestOnly:true}},{path:'/forgot-password',component:ForgotPasswordPage,meta:{guestOnly:true}},
  {path:'/preparing-workspace',component:PreparingWorkspacePage,meta:{requiresAuth:true}},
  {path:'/',component:AppShell,meta:{requiresAuth:true},children:[
    {path:'home',component:HomePage},{path:'categories',component:CategoriesPage},{path:'categories/new',component:NewCategoryPage},
    {path:'categories/:id',component:CategoryLayout,children:[{path:'',redirect:(to:any)=>`/categories/${to.params.id}/overview`},{path:'overview',component:CategoryOverview},{path:'board',component:CategoryBoard},{path:'list',component:CategoryList},{path:'timeline',component:CategoryTimeline},{path:'backlog',component:CategoryBacklog},{path:'files',component:CategoryFiles},{path:'settings',component:CategorySettings}]},
    {path:'your-work',component:YourWorkPage},{path:'statistics',component:StatisticsPage},{path:'tasks/:id',component:TaskDetailsPage},{path:'notifications',component:NotificationsPage},{path:'profile',component:ProfilePage},{path:'security',component:SecurityPage},{path:'sessions',component:SessionsPage},{path:'workspaces',component:WorkspacesPage},{path:'workspace/settings',component:WorkspaceSettingsPage}
  ]},{path:'/:pathMatch(.*)*',component:NotFoundPage}
]
const router = createRouter({history:createWebHistory(),routes,scrollBehavior:()=>({top:0})})

router.beforeEach(async to => {
  const auth = useAuthStore()
  if (to.path === '/tasks' && to.query.assigned === 'me') return '/your-work'
  if (auth.isSignedIn && !auth.profile) {
    try {
      await auth.initialize()
    } catch {
      auth.logout()
    }
  }
  if (to.meta.requiresAuth && !auth.isSignedIn) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.guestOnly && auth.isSignedIn) return '/home'
  return true
})

export default router
