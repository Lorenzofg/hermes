<template>
  <div class="space-y-6">

    <!-- Step 1: Upload -->
    <section class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
          Step 1 — Upload
        </h2>
        <span
          v-if="step !== 'upload'"
          class="text-xs text-zinc-500 underline underline-offset-2 cursor-pointer hover:text-zinc-300 transition-colors"
          @click="reset"
        >
          Start over
        </span>
      </div>

      <UploadZone v-model:file="file" />

      <div v-if="step === 'upload'" class="flex items-end justify-between gap-4">
        <div v-if="visibleProviders.length > 1" class="space-y-1.5">
          <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">AI Provider</label>
          <div class="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              v-for="p in visibleProviders"
              :key="p.value"
              class="px-4 py-2 text-xs font-semibold transition-colors"
              :class="provider === p.value
                ? 'bg-zinc-600 text-zinc-100'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
              @click="provider = p.value"
            >
              {{ p.label }}
            </button>
          </div>
        </div>
        <div v-else />

        <button
          :disabled="!file || loading"
          class="px-6 py-2 text-sm font-semibold rounded-lg transition-colors"
          :class="file && !loading
            ? 'bg-white text-zinc-900 hover:bg-zinc-100'
            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
          @click="runAnalysis"
        >
          {{ loading ? 'Analyzing...' : 'Analyze' }}
        </button>
      </div>

      <!-- Progress -->
      <div v-if="loading && progress" class="space-y-1.5">
        <p class="text-xs text-zinc-400">
          Processing page {{ progress.current }} of {{ progress.total }}...
        </p>
        <div class="w-full bg-zinc-700 rounded-full h-1.5">
          <div
            class="bg-white h-1.5 rounded-full transition-all"
            :style="{ width: `${(progress.current / progress.total) * 100}%` }"
          />
        </div>
      </div>
    </section>

    <!-- Error -->
    <div
      v-if="error"
      class="border border-red-700 bg-red-900/30 rounded-lg px-5 py-4 text-sm text-red-300"
    >
      {{ error }}
    </div>

    <!-- Step 2: Review -->
    <section v-if="step === 'review'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
          Step 2 — Review
          <span class="ml-2 text-zinc-600 normal-case tracking-normal font-normal">
            {{ editableDays.length }} days
          </span>
        </h2>
        <button
          :disabled="loading"
          class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50"
          @click="confirmAndSave"
        >
          {{ loading ? 'Saving...' : 'Confirm & Save' }}
        </button>
      </div>

      <div
        v-if="warnings.length"
        class="border border-amber-700 bg-amber-900/30 rounded-lg px-5 py-4"
      >
        <p class="text-xs font-semibold tracking-wide uppercase text-amber-400 mb-2">
          AI Warnings ({{ warnings.length }})
        </p>
        <ul class="space-y-1">
          <li v-for="(w, i) in warnings" :key="i" class="text-sm text-amber-300">— {{ w }}</li>
        </ul>
      </div>

      <div
        v-if="pageErrors.length"
        class="border border-red-700 bg-red-900/30 rounded-lg px-5 py-4 space-y-2"
      >
        <p class="text-xs font-semibold tracking-wide uppercase text-red-400">
          Page Errors ({{ pageErrors.length }} of {{ pageLog.length }} pages)
        </p>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Page {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </div>

      <EditableTable v-model:days="editableDays" />
    </section>

    <!-- Step 3: Saved -->
    <section v-if="step === 'saved'" class="space-y-4">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Step 3 — Done</h2>

      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-zinc-200">Analysis saved successfully</p>
            <p class="text-xs text-zinc-500 mt-0.5">ID #{{ savedId }}</p>
          </div>
          <div class="flex gap-2">
            <button
              class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
              @click="reset"
            >
              New Analysis
            </button>
            <button
              class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors"
              @click="downloadCsv(savedCsv, savedId!)"
            >
              Export CSV
            </button>
          </div>
        </div>

        <ResultTable :result="finalResult" />
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import UploadZone from '../../components/UploadZone.vue'
import EditableTable from '../../components/EditableTable.vue'
import ResultTable from '../../components/ResultTable.vue'
import { useTimesheet } from '../../composables/useTimesheet'
import { useProviders } from '../../composables/useProviders'
import type { DayEntry, AnalyzeTimesheetResponse, PageLogEntry } from '@hermes/types'

type Step = 'upload' | 'review' | 'saved'

const { loading, error, progress, analyzePreview, saveAnalysis, downloadCsv } = useTimesheet()
const { providers } = useProviders()

const allProviders = [
  { value: 'claude' as const, label: 'Claude' },
  { value: 'gpt'   as const, label: 'GPT' },
]
const visibleProviders = computed(() =>
  providers.value ? allProviders.filter((pr) => providers.value![pr.value]) : [],
)
const pageErrors = computed(() => pageLog.value.filter((p) => p.status === 'error'))

const step = ref<Step>('upload')
const file = ref<File | null>(null)
const provider = ref<'claude' | 'gpt'>('claude')

const editableDays = ref<DayEntry[]>([])
const warnings = ref<string[]>([])
const pageLog = ref<PageLogEntry[]>([])
const fileName = ref('')
const usage = ref<{ inputTokens: number; outputTokens: number } | null>(null)
const savedId = ref<number | null>(null)
const savedCsv = ref('')
const finalResult = ref<AnalyzeTimesheetResponse>({
  days: [], csvContent: '', totalDays: 0, warnings: [], pageLog: [],
})

async function runAnalysis() {
  if (!file.value) return

  const result = await analyzePreview(file.value, provider.value)
  if (!result) return

  fileName.value = result.fileName
  warnings.value = result.warnings
  pageLog.value  = result.pageLog
  usage.value    = result.usage
  editableDays.value = result.days.map((d) => ({
    date: d.date,
    shifts: [
      ...d.shifts,
      ...Array.from({ length: Math.max(0, 6 - d.shifts.length) }, () => ({ clockIn: '', clockOut: '' })),
    ].slice(0, 6),
  }))

  step.value = 'review'
}

async function confirmAndSave() {
  const result = await saveAnalysis(editableDays.value, provider.value, fileName.value, warnings.value, usage.value ?? undefined, pageLog.value)
  if (!result) return

  savedId.value = result.analysisId
  savedCsv.value = result.csvContent
  finalResult.value = {
    days: editableDays.value,
    csvContent: result.csvContent,
    totalDays: editableDays.value.length,
    warnings: warnings.value,
    pageLog: pageLog.value,
  }

  step.value = 'saved'
}

function reset() {
  step.value = 'upload'
  file.value = null
  editableDays.value = []
  warnings.value = []
  pageLog.value = []
  fileName.value = ''
  savedId.value = null
  savedCsv.value = ''
  usage.value = null
  error.value = null
}
</script>
