<template>
  <div class="space-y-6">

    <p class="text-xs text-zinc-500">
      Lote analisa um documento de cartão de ponto com vários funcionários — um PDF onde cada página pertence a uma pessoa diferente, separados em cartões de ponto individuais.
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

      <UploadZone v-model:file="file" />

      <div v-if="step === 'upload'" class="flex items-end justify-between flex-wrap gap-4">
        <ProviderPicker v-model="provider" :providers="providers" />

        <button
          :disabled="!file || loading"
          class="px-6 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors"
          :class="file && !loading
            ? 'bg-white text-zinc-900 hover:bg-zinc-100'
            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
          @click="runAnalysis"
        >
          {{ loading ? 'Analisando...' : 'Analisar' }}
        </button>
      </div>

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
            {{ editablePeople.length }} pessoas encontradas
          </span>
        </h2>
        <button
          :disabled="loading"
          class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50 whitespace-nowrap"
          @click="confirmAndSave"
        >
          {{ loading ? 'Salvando...' : 'Confirmar e Salvar' }}
        </button>
      </div>

      <CollapsibleBox v-if="pageErrors.length" variant="red">
        <template #title>Erros de Página ({{ pageErrors.length }} de {{ pageLog.length }} páginas)</template>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Página {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </CollapsibleBox>

      <div class="space-y-3">
        <div
          v-for="(person, i) in editablePeople"
          :key="i"
          class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
        >
          <div
            class="flex items-center justify-between flex-wrap gap-y-2 px-4 py-3 cursor-pointer hover:bg-zinc-700/40 transition-colors"
            @click="person.expanded = !person.expanded"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-zinc-200">{{ person.name }}</span>
              <span class="text-xs text-zinc-500 whitespace-nowrap">{{ person.days.length }} dias</span>
              <span v-if="person.warnings.length" class="text-xs text-amber-400 whitespace-nowrap">
                {{ person.warnings.length }} aviso{{ person.warnings.length !== 1 ? 's' : '' }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <button
                class="text-xs font-semibold text-zinc-300 hover:text-white transition-colors underline underline-offset-2 whitespace-nowrap"
                @click.stop="handleExportPersonCsv(person)"
              >
                Exportar CSV
              </button>
              <span class="text-xs text-zinc-500">{{ person.expanded ? '▲' : '▼' }}</span>
            </div>
          </div>

          <div v-if="person.expanded" class="border-t border-zinc-700 p-4 space-y-3">
            <div
              v-if="person.warnings.length"
              class="border border-amber-800 bg-amber-900/20 rounded px-3 py-2"
            >
              <p class="text-xs font-semibold tracking-wide uppercase text-amber-500 mb-1">Avisos</p>
              <WarningGroups :warnings="person.warnings" small />
            </div>
            <EditableTable v-model:days="person.days" />
          </div>
        </div>
      </div>
    </section>

    <!-- Step 3: Saved -->
    <section v-if="step === 'saved'" class="space-y-4">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Passo 3 — Concluído</h2>

      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-y-2">
          <div>
            <p class="text-sm font-semibold text-zinc-200">Análise em lote salva</p>
            <p class="text-xs text-zinc-500 mt-0.5">ID #{{ savedId }} — {{ savedPeople.length }} pessoas</p>
          </div>
          <div class="flex gap-2">
            <RouterLink
              :to="`/timesheet-batch/${savedId}`"
              class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
            >
              Ver
            </RouterLink>
            <button
              class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
              @click="reset"
            >
              Nova Análise
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="(person, i) in savedPeople"
            :key="i"
            class="flex items-center justify-between flex-wrap gap-y-2 py-2 border-b border-zinc-700 last:border-0"
          >
            <div>
              <p class="text-sm text-zinc-200">{{ person.name }}</p>
              <p class="text-xs text-zinc-500">{{ person.totalDays }} dias</p>
            </div>
            <button
              class="px-3 py-1 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors whitespace-nowrap"
              @click="downloadPersonCsv(savedId!, person.personId, person.name)"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UploadZone from '../../components/UploadZone.vue'
import EditableTable from '../../components/EditableTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import WarningGroups from '../../components/WarningGroups.vue'
import ProviderPicker from '../../components/ProviderPicker.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import { useBatchTimesheet } from '../../composables/useBatchTimesheet'
import { useTimesheet } from '../../composables/useTimesheet'
import { useProviders } from '../../composables/useProviders'
import { sortByDate } from '../../lib/competence'
import type { DayEntry, PageLogEntry, AIProvider } from '@hermes/types'

type Step = 'upload' | 'review' | 'saved'

interface EditablePerson {
  name: string
  days: DayEntry[]
  warnings: string[]
  expanded: boolean
}

const { loading, error, progress, analyzePreview, saveAnalysis, downloadPersonCsv } = useBatchTimesheet()
const { exportCsv, downloadCsv } = useTimesheet()
const { providers } = useProviders()

const pageErrors = computed(() => pageLog.value.filter((p) => p.status === 'error'))

const step     = ref<Step>('upload')
const file     = ref<File | null>(null)
const provider = ref<AIProvider>('claude')

// Default to whichever provider the user has actually configured, rather
// than always assuming Claude — otherwise Analyze silently fails for anyone
// who only set up GPT or Gemini.
watch(providers, (val) => {
  if (!val || val[provider.value]) return
  const configured = (['claude', 'gpt', 'gemini', 'openrouter'] as const).find((k) => val[k])
  if (configured) provider.value = configured
})

const fileName = ref('')
const usage    = ref<{ inputTokens: number; outputTokens: number } | null>(null)
const pageLog  = ref<PageLogEntry[]>([])

const editablePeople = ref<EditablePerson[]>([])
const savedId        = ref<number | null>(null)
const savedPeople    = ref<{ name: string; totalDays: number; personId: number }[]>([])

async function runAnalysis() {
  if (!file.value) return

  const result = await analyzePreview(file.value, provider.value)
  if (!result) return

  fileName.value = result.fileName
  usage.value    = result.usage
  pageLog.value  = result.pageLog
  editablePeople.value = result.people.map((p) => ({
    name:     p.name,
    days:     sortByDate(p.days).map((d) => ({
      date:   d.date,
      shifts: [...d.shifts, ...Array.from({ length: Math.max(0, 6 - d.shifts.length) }, () => ({ clockIn: '', clockOut: '' }))].slice(0, 6),
    })),
    warnings: p.warnings,
    expanded: false,
  }))

  step.value = 'review'
}

async function handleExportPersonCsv(person: EditablePerson) {
  const csvContent = await exportCsv(person.days)
  if (csvContent) downloadCsv(csvContent)
}

async function confirmAndSave() {
  const people = editablePeople.value.map(({ name, days, warnings }) => ({ name, days, warnings }))
  const result = await saveAnalysis(people, provider.value, fileName.value, usage.value ?? undefined, pageLog.value)
  if (!result) return

  savedId.value = result.analysisId

  try {
    const res  = await fetch(`/api/timesheet-batch/analyses/${result.analysisId}`)
    const data = await res.json()
    savedPeople.value = data.people.map((p: any) => ({
      name:      p.personName,
      totalDays: p.totalDays,
      personId:  p.id,
    }))
  } catch {
    savedPeople.value = editablePeople.value.map((p, i) => ({ name: p.name, totalDays: p.days.length, personId: i }))
  }

  step.value = 'saved'
}

function reset() {
  step.value           = 'upload'
  file.value           = null
  editablePeople.value = []
  fileName.value       = ''
  usage.value          = null
  pageLog.value        = []
  savedId.value        = null
  savedPeople.value    = []
  error.value          = null
}
</script>
