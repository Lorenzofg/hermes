<template>
  <div class="space-y-6 max-w-2xl">

    <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Settings</h2>
    <p class="text-xs text-zinc-500 -mt-4">
      Each provider needs your own API key and the exact model ID you want to use. Leave a field blank to keep what's already saved.
    </p>

    <div v-if="loading && !settings" class="text-sm text-zinc-500">Loading...</div>

    <template v-else>
      <section
        v-for="p in providerList"
        :key="p.key"
        class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-zinc-200">{{ p.label }}</h3>
          <span
            class="text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wide"
            :class="settings?.[p.key]?.configured ? 'bg-emerald-900/50 text-emerald-300' : 'bg-zinc-700 text-zinc-400'"
          >
            {{ settings?.[p.key]?.configured ? 'Configured' : 'Not configured' }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">API Key</label>
            <input
              v-model="form[p.key].apiKey"
              type="password"
              :placeholder="settings?.[p.key]?.keyPreview ?? 'Enter API key'"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Model ID</label>
            <input
              v-model="form[p.key].model"
              type="text"
              :placeholder="settings?.[p.key]?.model ?? p.modelExample"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-500"
            />
          </div>
        </div>
      </section>

      <div v-if="error" class="text-sm text-red-400">{{ error }}</div>
      <div v-if="saved" class="text-sm text-emerald-400">Settings saved.</div>

      <button
        :disabled="loading"
        class="px-6 py-2 text-sm font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50"
        @click="handleSave"
      >
        {{ loading ? 'Saving...' : 'Save' }}
      </button>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useSettings } from '../composables/useSettings'
import type { AIProvider } from '@hermes/types'

const { settings, loading, error, fetchSettings, saveSettings } = useSettings()
const saved = ref(false)

const providerList: { key: AIProvider; label: string; modelExample: string }[] = [
  { key: 'claude', label: 'Claude (Anthropic)', modelExample: 'e.g. claude-opus-5' },
  { key: 'gpt',    label: 'GPT (OpenAI)',        modelExample: 'e.g. gpt-4.1' },
  { key: 'gemini', label: 'Gemini (Google)',      modelExample: 'e.g. gemini-2.5-pro' },
]

const form = reactive<Record<AIProvider, { apiKey: string; model: string }>>({
  claude: { apiKey: '', model: '' },
  gpt:    { apiKey: '', model: '' },
  gemini: { apiKey: '', model: '' },
})

onMounted(fetchSettings)

async function handleSave() {
  saved.value = false

  const input: Record<string, { apiKey?: string; model?: string }> = {}
  for (const p of providerList) {
    const entry: { apiKey?: string; model?: string } = {}
    if (form[p.key].apiKey) entry.apiKey = form[p.key].apiKey
    if (form[p.key].model)  entry.model = form[p.key].model
    if (Object.keys(entry).length > 0) input[p.key] = entry
  }

  const ok = await saveSettings(input)
  if (ok) {
    saved.value = true
    for (const p of providerList) {
      form[p.key].apiKey = ''
      form[p.key].model = ''
    }
  }
}
</script>
