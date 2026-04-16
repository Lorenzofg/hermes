<template>
  <div class="min-h-screen bg-zinc-900 text-zinc-100">

    <header class="border-b border-zinc-700 bg-zinc-800 sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <RouterLink to="/timesheet" class="group">
          <h1 class="text-sm font-semibold tracking-widest uppercase text-zinc-100 group-hover:text-white transition-colors">
            Hermes
          </h1>
          <p class="text-xs text-zinc-400 mt-0.5">Document Analysis — PJe-Calc</p>
        </RouterLink>

        <nav class="flex items-center gap-6">
          <RouterLink
            to="/timesheet"
            class="text-xs font-medium tracking-wide uppercase transition-colors"
            :class="$route.path.startsWith('/timesheet') ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Timesheet
          </RouterLink>
          <RouterLink
            to="/payslip"
            class="text-xs font-medium tracking-wide uppercase transition-colors"
            :class="$route.path.startsWith('/payslip') ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Payslip
          </RouterLink>
          <div class="w-px h-4 bg-zinc-700" />
          <RouterLink
            to="/history"
            class="text-xs font-medium tracking-wide uppercase transition-colors"
            :class="$route.name === 'history' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            History
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-6 py-10">
      <RouterView />
    </main>

  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>
