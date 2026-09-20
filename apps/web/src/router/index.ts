import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const routes = [
  { path: '/', redirect: '/timesheet' },

  { path: '/login',    name: 'login',    component: () => import('../views/auth/LoginView.vue'), meta: { public: true } },
  { path: '/register', name: 'register', component: () => import('../views/auth/RegisterView.vue'), meta: { public: true } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },

  { path: '/timesheet',     name: 'timesheet-home',   component: () => import('../views/timesheet/HomeView.vue') },
  { path: '/timesheet/:id', name: 'timesheet-detail', component: () => import('../views/timesheet/DetailView.vue') },

  { path: '/timesheet-batch',     name: 'timesheet-batch',        component: () => import('../views/timesheet-batch/HomeView.vue') },
  { path: '/timesheet-batch/:id', name: 'timesheet-batch-detail', component: () => import('../views/timesheet-batch/DetailView.vue') },

  { path: '/payslip',       name: 'payslip-home',     component: () => import('../views/payslip/HomeView.vue') },
  { path: '/payslip/:id',   name: 'payslip-detail',   component: () => import('../views/payslip/DetailView.vue') },

  { path: '/pdf-cut',       name: 'pdf-cut',          component: () => import('../views/PdfCutView.vue') },

  { path: '/history',       name: 'history',          component: () => import('../views/HistoryView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const { token } = useAuth()

  if (!to.meta.public && !token.value) {
    return { name: 'login' }
  }
  if (to.meta.public && token.value) {
    return { name: 'timesheet-home' }
  }
})
