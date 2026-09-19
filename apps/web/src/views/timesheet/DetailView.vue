<template>
  <div class="space-y-6">

    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
        Timesheet #{{ route.params.id }}
      </h2>
      <div class="flex gap-2">
        <RouterLink
          to="/history"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
        >
          Back
        </RouterLink>
        <button
          v-if="result"
          class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors"
          @click="handleDownload"
        >
          Export CSV
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-zinc-500">Loading...</div>
    <div v-else-if="!result" class="text-sm text-red-400">Analysis not found.</div>

    <template v-else>
      <div
        v-if="result.warnings.length"
        class="border border-amber-700 bg-amber-900/30 rounded-lg px-5 py-4"
      >
        <p class="text-xs font-semibold tracking-wide uppercase text-amber-400 mb-2">
          Warnings ({{ result.warnings.length }})
        </p>
        <ul class="space-y-1">
          <li v-for="(w, i) in result.warnings" :key="i" class="text-sm text-amber-300">— {{ w }}</li>
        </ul>
      </div>

      <div
        v-if="pageErrors.length"
        class="border border-red-700 bg-red-900/30 rounded-lg px-5 py-4 space-y-2"
      >
        <p class="text-xs font-semibold tracking-wide uppercase text-red-400">
          Page Errors ({{ pageErrors.length }} of {{ result.pageLog.length }} pages)
        </p>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Page {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </div>

      <ResultTable :result="result" />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import ResultTable from '../../components/ResultTable.vue'
import { useTimesheet } from '../../composables/useTimesheet'
import type { AnalyzeTimesheetResponse } from '@hermes/types'

const route = useRoute()
const { downloadCsv } = useTimesheet()
const result = ref<AnalyzeTimesheetResponse | null>(null)
const loading = ref(true)
const pageErrors = computed(() => result.value?.pageLog.filter((p) => p.status === 'error') ?? [])

onMounted(async () => {
  try {
    const { data } = await axios.get<AnalyzeTimesheetResponse>(`/api/timesheet/analyses/${route.params.id}`)
    result.value = data
  } catch {
    result.value = null
  } finally {
    loading.value = false
  }
})

function handleDownload() {
  if (!result.value?.csvContent) return
  downloadCsv(result.value.csvContent, Number(route.params.id))
}
</script>
