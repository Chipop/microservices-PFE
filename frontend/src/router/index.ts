import { defineRouter } from '#q-app';
import { routes, handleHotUpdate } from 'vue-router/auto-routes';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Routes an unauthenticated visitor is allowed to reach.
const PUBLIC_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-token',
]);
const AUTH_ENTRY_ROUTES = new Set(['/login', '/register']);

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(({ store }) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  // Auth guard: everything except /login and /register requires a token.
  Router.beforeEach((to) => {
    const auth = useAuthStore(store);
    const isPublic = PUBLIC_ROUTES.has(to.path) || to.path.startsWith('/public/');

    if (!auth.isSignedIn && !isPublic) {
      return { path: '/login', query: { next: to.fullPath } };
    }
    if (auth.isSignedIn && AUTH_ENTRY_ROUTES.has(to.path)) {
      return { path: '/' };
    }
    return true;
  });

  // enable HMR for it
  if (import.meta.hot) {
    handleHotUpdate(Router);
  }

  return Router;
});
