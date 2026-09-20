<template>
  <div class="space-y-6">

    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
        Payslip Analysis #{{ route.params.id }}
      </h2>
      <RouterLink
        to="/history"
        class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
      >
        Back
      </RouterLink>
    </div>

    <div v-if="loading" class="text-sm text-zinc-500">Loading...</div>
    <div v-else-if="!analysis" class="text-sm text-red-400">Analysis not found.</div>

    <template v-else>
      <CollapsibleBox v-if="analysis.warnings.length" variant="amber">
        <template #title>Warnings ({{ analysis.warnings.length }})</template>
        <ul class="space-y-1">
          <li v-for="(w, i) in analysis.warnings" :key="i" class="text-sm text-amber-300">— {{ w }}</li>
        </ul>
      </CollapsibleBox>

      <CollapsibleBox v-if="pageErrors.length" variant="red">
        <template #title>Page Errors ({{ pageErrors.length }} of {{ analysis.pageLog.length }} pages)</template>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Page {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </CollapsibleBox>

      <PayslipTable :payslips="analysis.payslips" />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import PayslipTable from '../../components/PayslipTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import { sortByCompetence } from '../../lib/competence'
import type { Payslip, PageLogEntry } from '@hermes/types'

interface AnalysisDetail {
  id: number
  fileName: string
  provider: string
  createdAt: string
  warnings: string[]
  pageLog: PageLogEntry[]
  payslips: Payslip[]
}

const route = useRoute()
const analysis = ref<AnalysisDetail | null>(null)
const loading = ref(true)
const pageErrors = computed(() => analysis.value?.pageLog.filter((p) => p.status === 'error') ?? [])

onMounted(async () => {
  try {
    const { data } = await axios.get<AnalysisDetail>(`/api/payslip/analyses/${route.params.id}`)
    analysis.value = { ...data, payslips: sortByCompetence(data.payslips) }
  } catch {
    analysis.value = null
  } finally {
    loading.value = false
  }
})
</script>
