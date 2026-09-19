<template>
  <div class="max-w-sm mx-auto mt-16 space-y-6">
    <div class="text-center">
      <h1 class="text-sm font-semibold tracking-widest uppercase text-zinc-100">Hermes</h1>
      <p class="text-xs text-zinc-500 mt-1">Sign in to your account</p>
    </div>

    <form class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-1.5">
        <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Email</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Password</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      </div>

      <div v-if="error" class="text-xs text-red-400">{{ error }}</div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full px-4 py-2 text-sm font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50"
      >
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>

    <p class="text-center text-xs text-zinc-500">
      No account yet?
      <RouterLink to="/register" class="text-zinc-300 hover:text-white underline underline-offset-2">Register</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const { loading, error, login } = useAuth()

const email = ref('')
const password = ref('')

async function handleSubmit() {
  const ok = await login(email.value, password.value)
  if (ok) router.push('/timesheet')
}
</script>
