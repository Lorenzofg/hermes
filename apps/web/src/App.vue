<template>
  <div class="min-h-screen bg-zinc-900 text-zinc-100">

    <header class="border-b border-zinc-700 bg-zinc-800 sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <RouterLink to="/" class="group">
          <h1 class="text-sm font-semibold tracking-widest uppercase text-zinc-100 group-hover:text-white transition-colors">
            Hermes
          </h1>
          <p class="text-xs text-zinc-400 mt-0.5">Timesheet Analysis — PJe-Calc</p>
        </RouterLink>

        <nav class="flex items-center gap-6">
          <RouterLink
            to="/"
            class="text-xs font-medium tracking-wide uppercase transition-colors"
            :class="$route.name === 'home' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
          >
            New Analysis
          </RouterLink>
          <RouterLink
            to="/analyses"
            class="text-xs font-medium tracking-wide uppercase transition-colors"
            :class="$route.name === 'analyses' || $route.name === 'analysis-detail' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'"
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
