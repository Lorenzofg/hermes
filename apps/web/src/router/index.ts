import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/analyses',
    name: 'analyses',
    component: () => import('../views/AnalysesView.vue'),
  },
  {
    path: '/analyses/:id',
    name: 'analysis-detail',
    component: () => import('../views/AnalysisDetailView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
