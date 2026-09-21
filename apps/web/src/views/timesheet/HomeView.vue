<template>
  <div class="space-y-6">

    <p class="text-xs text-zinc-500">
      Cartão de Ponto analisa o cartão de ponto real de uma única pessoa (PDF/imagem), ou gera uma jornada presumida a partir do texto de uma determinação judicial, para períodos sem registro.
    </p>

    <!-- Step 1: Upload -->
    <section class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
          Passo 1 — Enviar arquivo
        </h2>
        <span
          v-if="step !== 'upload'"
          class="text-xs text-zinc-500 underline underline-offset-2 cursor-pointer hover:text-zinc-300 transition-colors"
          @click="reset"
        >
          Recomeçar
        </span>
      </div>

      <div v-if="step === 'upload'" class="flex rounded-lg border border-zinc-700 overflow-hidden w-fit">
        <button
          class="px-4 py-2 text-xs font-semibold transition-colors"
          :class="mode === 'real' ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
          @click="mode = 'real'"
        >
          Cartão Real
        </button>
        <button
          class="px-4 py-2 text-xs font-semibold transition-colors"
          :class="mode === 'presumed' ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
          @click="mode = 'presumed'"
        >
          Jornada Presumida
        </button>
      </div>

      <template v-if="mode === 'real'">
        <UploadZone v-model:file="file" />

        <div v-if="step === 'upload'" class="flex items-end justify-between gap-4">
          <ProviderPicker v-model="provider" :providers="providers" />

          <button
            :disabled="!file || loading"
            class="px-6 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="file && !loading
              ? 'bg-white text-zinc-900 hover:bg-zinc-100'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
            @click="runAnalysis"
          >
            {{ loading ? 'Analisando...' : 'Analisar' }}
          </button>
        </div>
      </template>

      <template v-else>
        <p class="text-xs text-zinc-500 -mt-2">
          Cole o trecho da decisão que descreve a jornada presumida e informe o período — os dias e horários são extraídos do texto, as datas ficam por sua conta.
        </p>

        <div class="space-y-1.5">
          <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Texto da determinação</label>
          <textarea
            v-model="presumedText"
            rows="6"
            placeholder="Cole aqui o trecho da decisão..."
            class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">De</label>
            <input
              v-model="presumedDateFrom"
              type="date"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Até</label>
            <input
              v-model="presumedDateTo"
              type="date"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>

        <div v-if="step === 'upload'" class="flex items-end justify-between gap-4">
          <ProviderPicker v-model="provider" :providers="providers" />

          <button
            :disabled="!canGeneratePresumed || loading"
            class="px-6 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="canGeneratePresumed && !loading
              ? 'bg-white text-zinc-900 hover:bg-zinc-100'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
            @click="runPresumedAnalysis"
          >
            {{ loading ? 'Gerando...' : 'Gerar Jornada' }}
          </button>
        </div>
      </template>

      <ProgressBar :loading="loading" :progress="progress" />
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
          Passo 2 — Revisão
          <span class="ml-2 text-zinc-600 normal-case tracking-normal font-normal">
            {{ editableDays.length }} dias
          </span>
        </h2>
        <div class="flex gap-2">
          <button
            :disabled="loading"
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50"
            @click="handleExportCsv"
          >
            Exportar CSV
          </button>
          <button
            :disabled="loading"
            class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50"
            @click="confirmAndSave"
          >
            {{ loading ? 'Salvando...' : 'Confirmar e Salvar' }}
          </button>
        </div>
      </div>

      <CollapsibleBox v-if="warnings.length" variant="amber">
        <template #title>Avisos da IA ({{ warnings.length }})</template>
        <ul class="space-y-1">
          <li v-for="(w, i) in warnings" :key="i" class="text-sm text-amber-300">— {{ w }}</li>
        </ul>
      </CollapsibleBox>

      <CollapsibleBox v-if="pageErrors.length" variant="red">
        <template #title>Erros de Página ({{ pageErrors.length }} de {{ pageLog.length }} páginas)</template>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Página {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </CollapsibleBox>

      <EditableTable v-model:days="editableDays" />
    </section>

    <!-- Step 3: Saved -->
    <section v-if="step === 'saved'" class="space-y-4">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Passo 3 — Concluído</h2>

      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-zinc-200">Análise salva com sucesso</p>
            <p class="text-xs text-zinc-500 mt-0.5">ID #{{ savedId }}</p>
          </div>
          <div class="flex gap-2">
            <button
              class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
              @click="reset"
            >
              Nova Análise
            </button>
            <button
              class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors"
              @click="downloadCsv(savedCsv, savedId!)"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <ResultTable :result="finalResult" />
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UploadZone from '../../components/UploadZone.vue'
import EditableTable from '../../components/EditableTable.vue'
import ResultTable from '../../components/ResultTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import ProviderPicker from '../../components/ProviderPicker.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import { useTimesheet } from '../../composables/useTimesheet'
import { useProviders } from '../../composables/useProviders'
import { sortByDate } from '../../lib/competence'
import type { DayEntry, AnalyzeTimesheetResponse, PageLogEntry, AIProvider } from '@hermes/types'

type Step = 'upload' | 'review' | 'saved'

const { loading, error, progress, analyzePreview, analyzePresumed, saveAnalysis, downloadCsv, exportCsv } = useTimesheet()
const { providers } = useProviders()

const pageErrors = computed(() => pageLog.value.filter((p) => p.status === 'error'))

type Mode = 'real' | 'presumed'

const step = ref<Step>('upload')
const mode = ref<Mode>('real')
const file = ref<File | null>(null)
const provider = ref<AIProvider>('claude')

const presumedText = ref('')
const presumedDateFrom = ref('')
const presumedDateTo = ref('')
const canGeneratePresumed = computed(() => !!presumedText.value.trim() && !!presumedDateFrom.value && !!presumedDateTo.value)

// Default to whichever provider the user has actually configured, rather
// than always assuming Claude — otherwise Analyze silently fails for anyone
// who only set up GPT or Gemini.
watch(providers, (val) => {
  if (!val || val[provider.value]) return
  const configured = (['claude', 'gpt', 'gemini'] as const).find((k) => val[k])
  if (configured) provider.value = configured
})

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
  editableDays.value = sortByDate(result.days).map((d) => ({
    date: d.date,
    shifts: [
      ...d.shifts,
      ...Array.from({ length: Math.max(0, 6 - d.shifts.length) }, () => ({ clockIn: '', clockOut: '' })),
    ].slice(0, 6),
  }))

  step.value = 'review'
}

function toBRDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

async function runPresumedAnalysis() {
  if (!canGeneratePresumed.value) return

  const result = await analyzePresumed(
    presumedText.value,
    toBRDate(presumedDateFrom.value),
    toBRDate(presumedDateTo.value),
    provider.value,
  )
  if (!result) return

  fileName.value = result.fileName
  warnings.value = result.warnings
  pageLog.value  = result.pageLog
  usage.value    = result.usage
  editableDays.value = sortByDate(result.days).map((d) => ({
    date: d.date,
    shifts: [
      ...d.shifts,
      ...Array.from({ length: Math.max(0, 6 - d.shifts.length) }, () => ({ clockIn: '', clockOut: '' })),
    ].slice(0, 6),
  }))

  step.value = 'review'
}

async function handleExportCsv() {
  const csvContent = await exportCsv(editableDays.value)
  if (csvContent) downloadCsv(csvContent)
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
  mode.value = 'real'
  file.value = null
  presumedText.value = ''
  presumedDateFrom.value = ''
  presumedDateTo.value = ''
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
