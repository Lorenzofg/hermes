<template>
  <div class="min-h-screen bg-zinc-900 text-zinc-100">

    <header v-if="!$route.meta.public" class="border-b border-zinc-700 bg-zinc-800 sticky top-0 z-10">
      <div class="mx-auto px-6 py-4 flex items-center justify-between" :class="$route.meta.wide ? 'max-w-7xl' : 'max-w-5xl'">
        <RouterLink to="/timesheet" class="group">
          <h1 class="text-sm font-semibold tracking-widest uppercase text-zinc-100 group-hover:text-white transition-colors">
            Hermes
          </h1>
          <p class="text-xs text-zinc-400 mt-0.5">Análise de Documentos — PJe-Calc</p>
        </RouterLink>

        <nav class="flex items-center flex-wrap justify-end gap-x-4 gap-y-2">
          <RouterLink
            to="/timesheet"
            class="text-xs font-medium uppercase whitespace-nowrap transition-colors"
            :class="$route.path === '/timesheet' || $route.path.startsWith('/timesheet/') ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Cartão de Ponto
          </RouterLink>
          <RouterLink
            to="/timesheet-batch"
            class="text-xs font-medium uppercase whitespace-nowrap transition-colors"
            :class="$route.path === '/timesheet-batch' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Lote
          </RouterLink>
          <RouterLink
            to="/payslip"
            class="text-xs font-medium uppercase whitespace-nowrap transition-colors"
            :class="$route.path.startsWith('/payslip') ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Holerite
          </RouterLink>
          <RouterLink
            to="/pdf-cut"
            class="text-xs font-medium uppercase whitespace-nowrap transition-colors"
            :class="$route.name === 'pdf-cut' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Cortar PDF
          </RouterLink>
          <div class="w-px h-4 bg-zinc-700" />
          <RouterLink
            to="/history"
            class="text-xs font-medium uppercase whitespace-nowrap transition-colors"
            :class="$route.name === 'history' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Histórico
          </RouterLink>
          <RouterLink
            to="/settings"
            class="text-xs font-medium uppercase whitespace-nowrap transition-colors"
            :class="$route.name === 'settings' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Configurações
          </RouterLink>
          <div class="w-px h-4 bg-zinc-700" />
          <div class="flex items-center gap-3">
            <span class="text-xs text-zinc-500 whitespace-nowrap">{{ user?.email }}</span>
            <button
              class="text-xs font-medium uppercase whitespace-nowrap text-zinc-400 hover:text-zinc-200 transition-colors"
              @click="handleLogout"
            >
              Sair
            </button>
          </div>
        </nav>
      </div>
    </header>

    <main class="mx-auto px-6 py-10" :class="$route.meta.wide ? 'max-w-7xl' : 'max-w-5xl'">
      <RouterView />
    </main>

  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'

const router = useRouter()
const { user, logout } = useAuth()

function handleLogout() {
  logout()
  router.push('/login')
}
</script>
