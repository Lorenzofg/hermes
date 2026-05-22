import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/timesheet' },

  { path: '/timesheet',       name: 'timesheet-home',   component: () => import('../views/timesheet/HomeView.vue') },
  { path: '/timesheet/:id',   name: 'timesheet-detail', component: () => import('../views/timesheet/DetailView.vue') },
  { path: '/timesheet-batch', name: 'timesheet-batch',  component: () => import('../views/timesheet/BatchView.vue') },

  { path: '/payslip',       name: 'payslip-home',     component: () => import('../views/payslip/HomeView.vue') },
  { path: '/payslip/:id',   name: 'payslip-detail',   component: () => import('../views/payslip/DetailView.vue') },

  { path: '/history',       name: 'history',          component: () => import('../views/HistoryView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
