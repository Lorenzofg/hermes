<template>
  <div class="space-y-6">

    <p class="text-xs text-zinc-500">
      Holerite analisa um holerite — extrai proventos, descontos e totais de um ou mais holerites no documento.
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
          <span v-if="payslips.length > 1" class="ml-2 text-zinc-600 normal-case tracking-normal font-normal">
            {{ payslips.length }} holerites encontrados
          </span>
        </h2>
        <button
          v-if="payslips.length"
          :disabled="loading"
          class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors disabled:opacity-50 whitespace-nowrap"
          @click="confirmAndSave"
        >
          {{ loading ? 'Salvando...' : `Confirmar e Salvar${payslips.length > 1 ? ` Todos (${payslips.length})` : ''}` }}
        </button>
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

      <p v-if="!payslips.length" class="text-sm text-zinc-500">
        Nenhum holerite pôde ser extraído deste documento. Verifique os erros/avisos acima, ou recomece com outro arquivo.
      </p>
      <PayslipTable v-else :payslips="payslips" />
    </section>

    <!-- Step 3: Saved -->
    <section v-if="step === 'saved'" class="space-y-4">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Passo 3 — Concluído</h2>

      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-y-2">
          <div>
            <p class="text-sm font-semibold text-zinc-200">
              {{ payslips.length }} holerite{{ payslips.length > 1 ? 's' : '' }} salvos com sucesso
            </p>
            <p class="text-xs text-zinc-500 mt-0.5">Análise #{{ savedId }}</p>
          </div>
          <button
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
            @click="reset"
          >
            Nova Análise
          </button>
        </div>

        <PayslipTable v-if="payslips.length" :payslips="payslips" />
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UploadZone from '../../components/UploadZone.vue'
import PayslipTable from '../../components/PayslipTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import ProviderPicker from '../../components/ProviderPicker.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import { usePayslip } from '../../composables/usePayslip'
import { useProviders } from '../../composables/useProviders'
import { sortByCompetence } from '../../lib/competence'
import type { Payslip, PageLogEntry, AIProvider } from '@hermes/types'

type Step = 'upload' | 'review' | 'saved'

const { loading, error, progress, analyzePreview, saveAnalysis } = usePayslip()
const { providers } = useProviders()

const pageErrors = computed(() => pageLog.value.filter((p) => p.status === 'error'))

const step = ref<Step>('upload')
const file = ref<File | null>(null)
const provider = ref<AIProvider>('claude')

// Default to whichever provider the user has actually configured, rather
// than always assuming Claude — otherwise Analyze silently fails for anyone
// who only set up GPT or Gemini.
watch(providers, (val) => {
  if (!val || val[provider.value]) return
  const configured = (['claude', 'gpt', 'gemini', 'openrouter'] as const).find((k) => val[k])
  if (configured) provider.value = configured
})

const payslips = ref<Payslip[]>([])
const warnings = ref<string[]>([])
const pageLog = ref<PageLogEntry[]>([])
const fileName = ref('')
const savedId = ref<number | null>(null)
const usage = ref<{ inputTokens: number; outputTokens: number } | null>(null)

async function runAnalysis() {
  if (!file.value) return

  const result = await analyzePreview(file.value, provider.value)
  if (!result) return

  payslips.value = sortByCompetence(result.payslips)
  warnings.value = result.warnings
  pageLog.value  = result.pageLog
  fileName.value = result.fileName
  usage.value    = result.usage
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
  error.value = null
}
</script>
