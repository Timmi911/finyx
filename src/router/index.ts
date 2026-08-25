import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from 'vue-router'
import { authStore } from '../stores/auth'

/** 这些路径无需登录即可访问 */
const PUBLIC_PATHS = ['/login', '/register']
/** 登录后不允许再次访问的路径（直接跳到主页） */
const AUTH_GATED_PATHS = ['/login', '/register']
/** 登录/注册后的默认落地页 */
const DEFAULT_LOGIN_REDIRECT = '/'

export const routes: RouteRecordRaw[] = [
  // =============== 公开路由（登录/注册）===============
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { public: true, title: '注册' },
  },

  // =============== 业务路由（需要登录）===============
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/bills', name: 'bills', component: () => import('../views/BillsView.vue') },
  { path: '/capture', name: 'capture', component: () => import('../views/CaptureView.vue') },
  { path: '/reimburse', name: 'reimburse', component: () => import('../views/ReimbursementView.vue') },
  { path: '/analytics', name: 'analytics', component: () => import('../views/AnalyticsView.vue') },
  { path: '/accounts', name: 'accounts', component: () => import('../views/AccountsView.vue') },
  { path: '/family', name: 'family', component: () => import('../views/FamilyView.vue') },
  { path: '/goals', name: 'goals', component: () => import('../views/GoalsView.vue') },
  { path: '/income', name: 'income', component: () => import('../views/IncomePlanView.vue') },
  { path: '/fun', name: 'fun', component: () => import('../views/FunCenterView.vue') },
  { path: '/fun/mouthpiece', name: 'fun-mouthpiece', component: () => import('../views/fun/MouthpieceView.vue') },
  { path: '/fun/fortune', name: 'fun-fortune', component: () => import('../views/fun/FortuneView.vue') },
  { path: '/fun/achievements', name: 'fun-achievements', component: () => import('../views/fun/AchievementsView.vue') },
  { path: '/fun/selfbet', name: 'fun-selfbet', component: () => import('../views/fun/SelfBetView.vue') },
  { path: '/fun/moneytree', name: 'fun-moneytree', component: () => import('../views/fun/MoneyTreeView.vue') },
  { path: '/fun/pkchallenge', name: 'fun-pkchallenge', component: () => import('../views/fun/PkChallengeView.vue') },

  // =============== 兜底：404 → 重定向到首页（保持体验简洁）===============
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * 全局前置守卫
 * 规则：
 *  1. 未登录 + 访问非公开路径 → 跳到 /login?redirect=目标路径
 *  2. 已登录 + 访问 /login|/register → 跳到首页（避免重复登录）
 *  3. 其他 → 放行
 */
router.beforeEach((to) => {
  const isPublic = to.matched.some(r => r.meta?.public === true) || PUBLIC_PATHS.includes(to.path)
  const isAuthGated = AUTH_GATED_PATHS.includes(to.path)
  const loggedIn = authStore.isAuthenticated.value

  if (!loggedIn && !isPublic) {
    // 未登录访问受保护页面：跳到登录页，保留原始目标路径以便登录后回跳
    return {
      path: '/login',
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    }
  }

  if (loggedIn && isAuthGated) {
    // 已登录仍访问登录/注册：直接回到首页（避免重复登录）
    return { path: DEFAULT_LOGIN_REDIRECT, replace: true }
  }

  // 放行
  return true
})
