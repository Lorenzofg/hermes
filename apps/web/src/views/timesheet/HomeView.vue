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
          class="px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors"
          :class="mode === 'real' ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
          @click="mode = 'real'"
        >
          Cartão Real
        </button>
        <button
          class="px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors"
          :class="mode === 'presumed' ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
          @click="mode = 'presumed'"
        >
          Presumida
        </button>
      </div>

      <template v-if="mode === 'real'">
        <UploadZone v-model:files="files" multiple />

        <div v-if="step === 'upload'" class="flex items-end justify-between flex-wrap gap-4">
          <ProviderPicker v-model="provider" :providers="providers" />

          <button
            :disabled="!files.length || loading"
            class="px-6 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors"
            :class="files.length && !loading
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

        <div v-if="step === 'upload'" class="flex items-end justify-between flex-wrap gap-4">
          <ProviderPicker v-model="provider" :providers="providers" />

          <button
            :disabled="!canGeneratePresumed || loading"
            class="px-6 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors"
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
      <div class="flex items-center justify-between flex-wrap gap-y-2">
        <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
          Passo 2 — Revisão
          <span class="ml-2 text-zinc-600 normal-case tracking-normal font-normal">
            {{ editableDays.length }} dias
          </span>
        </h2>
        <div class="flex gap-2">
          <button
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
            :class="showAdjust ? 'bg-zinc-700' : ''"
            @click="showAdjust = !showAdjust; showPresume = false"
          >
            Ajustar pela determinação
          </button>
          <button
            v-if="missing.length || daysBeforePresume"
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
            :class="showPresume ? 'bg-zinc-700' : ''"
            @click="showPresume = !showPresume; showAdjust = false"
          >
            Presumir meses faltantes
          </button>
          <button
            :disabled="loading"
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            @click="handleExportCsv"
          >
            Exportar CSV
          </button>
          <button
            :disabled="loading"
            class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            @click="confirmAndSave"
          >
            {{ loading ? 'Salvando...' : 'Confirmar e Salvar' }}
          </button>
        </div>
      </div>

      <section v-if="showAdjust" class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
        <p class="text-xs text-zinc-500">
          Cole o trecho da decisão que altera o que foi registrado — por exemplo, um intervalo de 1h no lugar das 2h marcadas, ou uma jornada em turno de revezamento que se repete a cada N semanas. Os horários são extraídos do texto e aplicados aos dias da tabela; o período é opcional (vazio = todos os dias).
        </p>

        <textarea
          v-model="adjustText"
          rows="4"
          placeholder="Cole aqui o trecho da decisão..."
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-500"
        />

        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Início da determinação</label>
            <input
              v-model="adjustStartDate"
              type="date"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <p class="text-[11px] text-zinc-500">Primeiro dia da semana 1 — obrigatório em turno de revezamento.</p>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">De (opcional)</label>
            <input
              v-model="adjustDateFrom"
              type="date"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Até (opcional)</label>
            <input
              v-model="adjustDateTo"
              type="date"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2">
          <button
            v-if="daysBeforeAdjust"
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
            @click="undoAdjust"
          >
            Desfazer
          </button>
          <button
            :disabled="!adjustText.trim() || loading"
            class="px-4 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap"
            :class="adjustText.trim() && !loading
              ? 'bg-white text-zinc-900 hover:bg-zinc-100'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
            @click="runAdjustment"
          >
            {{ loading ? 'Aplicando...' : 'Aplicar' }}
          </button>
        </div>
      </section>

      <PresumeMissingPanel
        v-show="showPresume"
        v-model:provider="provider"
        :months="missing"
        :providers="providers"
        :loading="loading"
        :can-undo="!!daysBeforePresume"
        @apply="runPresume"
        @undo="undoPresume"
      />

      <StatusBanner :busy="busy" :notice="notice" @close="notice = null" />

      <CollapsibleBox v-if="warnings.length" variant="amber">
        <template #title>Avisos da IA ({{ warnings.length }})</template>
        <WarningGroups :warnings="warnings" />
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
        <div class="flex items-center justify-between flex-wrap gap-y-2">
          <div>
            <p class="text-sm font-semibold text-zinc-200">Análise salva com sucesso</p>
            <p class="text-xs text-zinc-500 mt-0.5">ID #{{ savedId }}</p>
          </div>
          <div class="flex gap-2">
            <button
              class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
              @click="reset"
            >
              Nova Análise
            </button>
            <button
              class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors whitespace-nowrap"
              @click="downloadCsv(savedCsv, savedId!)"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <ResultTable :result="finalResult" />
      </div>
    </section>

    <ChatPanel
      v-if="step === 'review'"
      v-model:days="editableDays"
      v-model:warnings="warnings"
      :provider="provider"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UploadZone from '../../components/UploadZone.vue'
import EditableTable from '../../components/EditableTable.vue'
import ResultTable from '../../components/ResultTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import WarningGroups from '../../components/WarningGroups.vue'
import PresumeMissingPanel from '../../components/PresumeMissingPanel.vue'
import StatusBanner from '../../components/StatusBanner.vue'
import { countChangedDays } from '../../lib/days'
import { missingMonths, withoutMissing } from '../../lib/warnings'
import ProviderPicker from '../../components/ProviderPicker.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import ChatPanel from '../../components/ChatPanel.vue'
import { useTimesheet } from '../../composables/useTimesheet'
import { useProviders } from '../../composables/useProviders'
import { sortByDate } from '../../lib/competence'
import type { DayEntry, AnalyzeTimesheetResponse, PageLogEntry, AIProvider } from '@hermes/types'

type Step = 'upload' | 'review' | 'saved'

const { loading, error, progress, analyzePreview, analyzePresumed, adjustDays, presumeMissing, saveAnalysis, downloadCsv, exportCsv } = useTimesheet()
const { providers } = useProviders()

const pageErrors = computed(() => pageLog.value.filter((p) => p.status === 'error'))

type Mode = 'real' | 'presumed'

const step = ref<Step>('upload')
const mode = ref<Mode>('real')
const files = ref<File[]>([])
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
  const configured = (['claude', 'gpt', 'gemini', 'openrouter'] as const).find((k) => val[k])
  if (configured) provider.value = configured
})

const editableDays = ref<DayEntry[]>([])
const showAdjust = ref(false)
const adjustText = ref('')
const adjustStartDate = ref('')
const adjustDateFrom = ref('')
const adjustDateTo = ref('')
const daysBeforeAdjust = ref<DayEntry[] | null>(null)
const warnings = ref<string[]>([])
const showPresume = ref(false)
const daysBeforePresume = ref<{ days: DayEntry[]; warnings: string[] } | null>(null)
const missing = computed(() => missingMonths(warnings.value))

const busy = ref<string | null>(null)
const notice = ref<string | null>(null)

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const pageLog = ref<PageLogEntry[]>([])
const fileName = ref('')
const usage = ref<{ inputTokens: number; outputTokens: number } | null>(null)
const savedId = ref<number | null>(null)
const savedCsv = ref('')
const finalResult = ref<AnalyzeTimesheetResponse>({
  days: [], csvContent: '', totalDays: 0, warnings: [], pageLog: [],
})

// The table always shows 6 shift columns, so pad every day up to 6.
function toEditable(days: DayEntry[]): DayEntry[] {
  return sortByDate(days).map((d) => ({
    date: d.date,
    shifts: [
      ...d.shifts,
      ...Array.from({ length: Math.max(0, 6 - d.shifts.length) }, () => ({ clockIn: '', clockOut: '' })),
    ].slice(0, 6),
  }))
}

async function runAnalysis() {
  if (!files.value.length) return

  const result = await analyzePreview(files.value, provider.value)
  if (!result) return

  fileName.value = result.fileName
  warnings.value = result.warnings
  pageLog.value  = result.pageLog
  usage.value    = result.usage
  editableDays.value = toEditable(result.days)

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
  editableDays.value = toEditable(result.days)

  step.value = 'review'
}

// Applies the judge's determination over the days currently on the table,
// keeping a snapshot so one click can't destroy what was scanned.
async function runAdjustment() {
  if (!adjustText.value.trim()) return

  const snapshot = JSON.parse(JSON.stringify(editableDays.value)) as DayEntry[]
  notice.value = null
  busy.value = 'Aplicando o ajuste da determinação…'
  const result = await adjustDays(
    editableDays.value,
    adjustText.value,
    adjustDateFrom.value ? toBRDate(adjustDateFrom.value) : '',
    adjustDateTo.value ? toBRDate(adjustDateTo.value) : '',
    provider.value,
    adjustStartDate.value ? toBRDate(adjustStartDate.value) : '',
  ).finally(() => { busy.value = null })
  if (!result) return

  daysBeforeAdjust.value = snapshot
  showAdjust.value = false
  editableDays.value = toEditable(result.days)
  warnings.value = [...warnings.value, ...result.warnings]
  notice.value = `Ajuste aplicado: ${plural(countChangedDays(snapshot, editableDays.value), 'dia alterado', 'dias alterados')}. Confira a tabela e salve para gravar.`
  if (usage.value) {
    usage.value = {
      inputTokens:  usage.value.inputTokens + result.usage.inputTokens,
      outputTokens: usage.value.outputTokens + result.usage.outputTokens,
    }
  }
}

// Fills the months the defendant never attached; snapshot allows one-click undo.
async function runPresume(months: string[], text: string, startDate: string) {
  const snapshot = { days: JSON.parse(JSON.stringify(editableDays.value)) as DayEntry[], warnings: [...warnings.value] }
  notice.value = null
  busy.value = 'Presumindo os meses faltantes…'
  const result = await presumeMissing(editableDays.value, months, text, provider.value, startDate).finally(() => { busy.value = null })
  if (!result) return

  daysBeforePresume.value = snapshot
  showPresume.value = false
  editableDays.value = toEditable(result.days)
  warnings.value = [...withoutMissing(warnings.value, months), ...result.warnings]
  notice.value = `Meses presumidos: ${months.join(', ')} — ${plural(countChangedDays(snapshot.days, editableDays.value), 'dia gerado', 'dias gerados')}. Confira a tabela e salve para gravar.`
  if (usage.value) {
    usage.value = {
      inputTokens:  usage.value.inputTokens + result.usage.inputTokens,
      outputTokens: usage.value.outputTokens + result.usage.outputTokens,
    }
  }
}

function undoPresume() {
  if (!daysBeforePresume.value) return
  editableDays.value = daysBeforePresume.value.days
  warnings.value = daysBeforePresume.value.warnings
  daysBeforePresume.value = null
  notice.value = 'Presunção desfeita.'
}

function undoAdjust() {
  if (!daysBeforeAdjust.value) return
  editableDays.value = daysBeforeAdjust.value
  daysBeforeAdjust.value = null
  notice.value = 'Ajuste desfeito.'
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
  files.value = []
  presumedText.value = ''
  presumedDateFrom.value = ''
  presumedDateTo.value = ''
  editableDays.value = []
  showAdjust.value = false
  adjustText.value = ''
  adjustStartDate.value = ''
  adjustDateFrom.value = ''
  adjustDateTo.value = ''
  daysBeforeAdjust.value = null
  showPresume.value = false
  daysBeforePresume.value = null
  notice.value = null
  warnings.value = []
  pageLog.value = []
  fileName.value = ''
  savedId.value = null
  savedCsv.value = ''
  usage.value = null
  error.value = null
}
</script>
