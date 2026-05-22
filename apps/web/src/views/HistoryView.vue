<template>
  <div class="space-y-6">

    <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">History</h2>

    <div v-if="loading" class="text-sm text-zinc-500">Loading...</div>

    <div
      v-else-if="list.length === 0"
      class="bg-zinc-800 border border-zinc-700 rounded-lg px-6 py-12 text-center"
    >
      <p class="text-sm text-zinc-500">No analyses yet.</p>
    </div>

    <div v-else class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-700">
            <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">#</th>
            <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">Type</th>
            <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">File</th>
            <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">Provider</th>
            <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">Summary</th>
            <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">Tokens</th>
            <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">Date</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in list"
            :key="`${item.type}-${item.id}`"
            class="border-b border-zinc-700/60 last:border-0 hover:bg-zinc-700/40 transition-colors"
            :class="idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-700/20'"
          >
            <td class="px-4 py-3 font-mono text-xs text-zinc-500">{{ item.id }}</td>
            <td class="px-4 py-3 text-xs">
              <span class="px-2 py-0.5 rounded text-zinc-300 font-medium tracking-wide uppercase"
                :class="typeBadge(item.type)">
                {{ item.type }}
              </span>
            </td>
            <td class="px-4 py-3 text-zinc-200 text-xs">{{ item.fileName }}</td>
            <td class="px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide">{{ item.provider }}</td>
            <td class="px-4 py-3 text-xs text-zinc-300">{{ item.summary }}</td>
            <td class="px-4 py-3 font-mono text-xs text-zinc-500 whitespace-nowrap">
              <span class="text-zinc-400">↑{{ formatTokens(item.inputTokens) }}</span>
              <span class="mx-1 text-zinc-600">/</span>
              <span class="text-zinc-400">↓{{ formatTokens(item.outputTokens) }}</span>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-zinc-400">{{ formatDate(item.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <RouterLink
                :to="item.detailPath"
                class="text-xs text-zinc-300 hover:text-white transition-colors underline underline-offset-2"
              >
                View
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'

interface HistoryItem {
  id: number
  type: string
  createdAt: string
  provider: string
  fileName: string
  summary: string
  inputTokens: number
  outputTokens: number
  detailPath: string
}

const TYPE_BADGE: Record<string, string> = {
  timesheet: 'bg-blue-900/50 text-blue-300',
  batch:     'bg-violet-900/50 text-violet-300',
  payslip:   'bg-emerald-900/50 text-emerald-300',
}

const list = ref<HistoryItem[]>([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await axios.get<HistoryItem[]>('/api/history')
  list.value = data
  loading.value = false
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  const date = d.toISOString().slice(0, 10).split('-').reverse().join('/')
  const time = d.toISOString().slice(11, 16)
  return `${date} ${time}`
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function typeBadge(type: string): string {
  return TYPE_BADGE[type] ?? 'bg-zinc-700 text-zinc-300'
}
</script>
