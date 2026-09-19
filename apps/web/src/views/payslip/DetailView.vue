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
      <div
        v-if="analysis.warnings.length"
        class="border border-amber-700 bg-amber-900/30 rounded-lg px-5 py-4"
      >
        <p class="text-xs font-semibold tracking-wide uppercase text-amber-400 mb-2">
          Warnings ({{ analysis.warnings.length }})
        </p>
        <ul class="space-y-1">
          <li v-for="(w, i) in analysis.warnings" :key="i" class="text-sm text-amber-300">— {{ w }}</li>
        </ul>
      </div>

      <div
        v-if="pageErrors.length"
        class="border border-red-700 bg-red-900/30 rounded-lg px-5 py-4 space-y-2"
      >
        <p class="text-xs font-semibold tracking-wide uppercase text-red-400">
          Page Errors ({{ pageErrors.length }} of {{ analysis.pageLog.length }} pages)
        </p>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Page {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </div>

      <!-- Pagination if multiple payslips -->
      <div v-if="analysis.payslips.length > 1" class="flex items-center gap-2">
        <button
          v-for="(_, i) in analysis.payslips"
          :key="i"
          class="px-3 py-1 text-xs rounded transition-colors"
          :class="currentIndex === i ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'"
          @click="currentIndex = i"
        >
          {{ i + 1 }}
        </button>
        <span class="text-xs text-zinc-500 ml-1">{{ analysis.payslips.length }} holerites</span>
      </div>

      <PayslipCard v-if="currentPayslip" :payslip="currentPayslip" />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import PayslipCard from '../../components/PayslipCard.vue'
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
const currentIndex = ref(0)
const pageErrors = computed(() => analysis.value?.pageLog.filter((p) => p.status === 'error') ?? [])

const currentPayslip = computed(() => analysis.value?.payslips[currentIndex.value] ?? null)

onMounted(async () => {
  try {
    const { data } = await axios.get<AnalysisDetail>(`/api/payslip/analyses/${route.params.id}`)
    analysis.value = data
  } catch {
    analysis.value = null
  } finally {
    loading.value = false
  }
})
</script>
