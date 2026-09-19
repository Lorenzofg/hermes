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
        <div v-else-if="visibleProviders.length === 1" class="space-y-1.5">
          <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">AI Provider</label>
          <p class="text-sm text-zinc-300">{{ visibleProviders[0].label }}</p>
        </div>
        <p v-else-if="providers" class="text-xs text-amber-400">
          No provider configured —
          <RouterLink to="/settings" class="underline underline-offset-2 hover:text-amber-300">set one up in Settings</RouterLink>.
        </p>
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
          <span v-if="payslips.length > 1" class="ml-2 text-zinc-600 normal-case tracking-normal font-normal">
            {{ payslips.length }} payslips found
          </span>
        </h2>
        <button
          v-if="currentPayslip"
          :disabled="loading"
          class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50"
          @click="confirmAndSave"
        >
          {{ loading ? 'Saving...' : `Confirm & Save${payslips.length > 1 ? ` All (${payslips.length})` : ''}` }}
        </button>
      </div>

      <CollapsibleBox v-if="warnings.length" variant="amber">
        <template #title>AI Warnings ({{ warnings.length }})</template>
        <ul class="space-y-1">
          <li v-for="(w, i) in warnings" :key="i" class="text-sm text-amber-300">— {{ w }}</li>
        </ul>
      </CollapsibleBox>

      <CollapsibleBox v-if="pageErrors.length" variant="red">
        <template #title>Page Errors ({{ pageErrors.length }} of {{ pageLog.length }} pages)</template>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Page {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </CollapsibleBox>

      <!-- Pagination if multiple payslips -->
      <div v-if="payslips.length > 1" class="flex items-center gap-2">
        <button
          v-for="(_, i) in payslips"
          :key="i"
          class="px-3 py-1 text-xs rounded transition-colors"
          :class="currentIndex === i ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
          @click="currentIndex = i"
        >
          {{ i + 1 }}
        </button>
      </div>

      <p v-if="!currentPayslip" class="text-sm text-zinc-500">
        No payslip could be extracted from this document. Check the errors/warnings above, or start over with a different file.
      </p>
      <PayslipCard v-else :payslip="currentPayslip" />
    </section>

    <!-- Step 3: Saved -->
    <section v-if="step === 'saved'" class="space-y-4">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Step 3 — Done</h2>

      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-zinc-200">
              {{ payslips.length }} holerite{{ payslips.length > 1 ? 's' : '' }} salvos com sucesso
            </p>
            <p class="text-xs text-zinc-500 mt-0.5">Analysis #{{ savedId }}</p>
          </div>
          <button
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
            @click="reset"
          >
            New Analysis
          </button>
        </div>

        <PayslipCard v-if="currentPayslip" :payslip="currentPayslip" />
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import UploadZone from '../../components/UploadZone.vue'
import PayslipCard from '../../components/PayslipCard.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import { usePayslip } from '../../composables/usePayslip'
import { useProviders } from '../../composables/useProviders'
import type { Payslip, PageLogEntry, AIProvider } from '@hermes/types'

type Step = 'upload' | 'review' | 'saved'

const { loading, error, progress, analyzePreview, saveAnalysis } = usePayslip()
const { providers } = useProviders()

const allProviders = [
  { value: 'claude' as const, label: 'Claude' },
  { value: 'gpt'   as const, label: 'GPT' },
  { value: 'gemini' as const, label: 'Gemini' },
]
const visibleProviders = computed(() =>
  providers.value ? allProviders.filter((pr) => providers.value![pr.value]) : [],
)
const pageErrors = computed(() => pageLog.value.filter((p) => p.status === 'error'))

const step = ref<Step>('upload')
const file = ref<File | null>(null)
const provider = ref<AIProvider>('claude')

// Default to whichever provider the user has actually configured, rather
// than always assuming Claude — otherwise Analyze silently fails for anyone
// who only set up GPT or Gemini.
watch(providers, (val) => {
  if (!val || val[provider.value]) return
  const configured = (['claude', 'gpt', 'gemini'] as const).find((k) => val[k])
  if (configured) provider.value = configured
})

const payslips = ref<Payslip[]>([])
const warnings = ref<string[]>([])
const pageLog = ref<PageLogEntry[]>([])
const fileName = ref('')
const savedId = ref<number | null>(null)
const currentIndex = ref(0)
const usage = ref<{ inputTokens: number; outputTokens: number } | null>(null)

const currentPayslip = computed(() => payslips.value[currentIndex.value] ?? null)

async function runAnalysis() {
  if (!file.value) return

  const result = await analyzePreview(file.value, provider.value)
  if (!result) return

  payslips.value = result.payslips
  warnings.value = result.warnings
  pageLog.value  = result.pageLog
  fileName.value = result.fileName
  usage.value    = result.usage
  currentIndex.value = 0
  step.value = 'review'
}

async function confirmAndSave() {
  const result = await saveAnalysis(payslips.value, warnings.value, provider.value, fileName.value, usage.value ?? undefined, pageLog.value)
  if (!result) return

  savedId.value = result.analysisId
  step.value = 'saved'
}

function reset() {
  step.value = 'upload'
  file.value = null
  payslips.value = []
  warnings.value = []
  pageLog.value = []
  fileName.value = ''
  savedId.value = null
  usage.value = null
  currentIndex.value = 0
  error.value = null
}
</script>
