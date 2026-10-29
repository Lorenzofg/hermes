<template>
  <div class="space-y-6">

    <div class="flex items-center justify-between flex-wrap gap-y-2">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400 whitespace-nowrap">
        Cartão de Ponto #{{ route.params.id }}
      </h2>
      <div class="flex gap-2 flex-wrap">
        <RouterLink
          to="/history"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
        >
          Voltar
        </RouterLink>
        <button
          v-if="result"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
          :class="showAdjust ? 'bg-zinc-700' : ''"
          @click="showAdjust = !showAdjust; showPresume = false; showAddPeriod = false"
        >
          Ajustar pela determinação
        </button>
        <button
          v-if="result && (missing.length || daysBeforePresume)"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
          :class="showPresume ? 'bg-zinc-700' : ''"
          @click="showPresume = !showPresume; showAdjust = false; showAddPeriod = false"
        >
          Presumir meses faltantes
        </button>
        <button
          v-if="result"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
          :class="showAddPeriod ? 'bg-zinc-700' : ''"
          @click="showAddPeriod = !showAddPeriod; showAdjust = false; showPresume = false"
        >
          Acrescentar período
        </button>
        <button
          v-if="result"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Salvando...' : 'Salvar alterações' }}
        </button>
        <button
          v-if="result"
          class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors whitespace-nowrap"
          @click="handleDownload"
        >
          Exportar CSV
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-zinc-500">Carregando...</div>
    <div v-else-if="!result" class="text-sm text-red-400">Análise não encontrada.</div>

    <template v-else>
      <section v-if="versions.length > 0" class="bg-zinc-800 border border-zinc-700 rounded-lg">
        <button
          class="w-full flex items-center justify-between px-4 py-3 text-left"
          @click="showVersions = !showVersions"
        >
          <p class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
            Versões ({{ versions.length }})
          </p>
          <span class="text-xs text-zinc-500">{{ showVersions ? '▲' : '▼' }}</span>
        </button>

        <ul v-if="showVersions" class="border-t border-zinc-700 divide-y divide-zinc-700/60">
          <li
            v-for="v in versions"
            :key="v.version"
            class="flex items-center justify-between gap-3 px-4 py-2"
          >
            <div class="min-w-0">
              <p class="text-xs text-zinc-300">
                v{{ v.version }}
                <span v-if="v.version === versions[0].version" class="text-emerald-400">· atual</span>
              </p>
              <p class="text-[11px] text-zinc-500 truncate">
                {{ sourceLabel(v.source) }} · {{ v.totalDays }} dia{{ v.totalDays === 1 ? '' : 's' }} · {{ formatDate(v.createdAt) }}
              </p>
            </div>
            <button
              v-if="v.version !== versions[0].version"
              :disabled="restoring === v.version"
              class="px-3 py-1 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50 whitespace-nowrap"
              @click="restoreVersion(v.version)"
            >
              {{ restoring === v.version ? 'Restaurando...' : 'Restaurar' }}
            </button>
          </li>
        </ul>
      </section>

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

        <div class="flex items-center justify-between gap-2 flex-wrap">
          <ProviderPicker v-model="provider" :providers="providers" />
          <div class="flex gap-2">
          <button
            v-if="daysBeforeAdjust"
            class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
            @click="undoAdjust"
          >
            Desfazer
          </button>
          <button
            :disabled="!adjustText.trim() || saving"
            class="px-4 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap"
            :class="adjustText.trim() && !saving
              ? 'bg-white text-zinc-900 hover:bg-zinc-100'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
            @click="runAdjustment"
          >
            {{ saving ? 'Aplicando...' : 'Aplicar' }}
          </button>
          </div>
        </div>
      </section>

      <PresumeMissingPanel
        v-show="showPresume"
        v-model:provider="provider"
        :months="missing"
        :providers="providers"
        :loading="saving"
        :can-undo="!!daysBeforePresume"
        @apply="runPresume"
        @undo="undoPresume"
      />

      <section v-if="showAddPeriod" class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
        <p class="text-xs text-zinc-500">
          Cole o trecho da decisão que manda acrescentar um período — por exemplo, "acrescente o período de 15/06/2021 a 30/09/2022, de segunda a sexta das 08:00 às 12:00 e das 14:00 às 19:30, e aos sábados das 08:00 às 19:00". O período e os horários são extraídos do texto; os dias que já têm marcação não são alterados.
        </p>

        <textarea
          v-model="addPeriodText"
          rows="4"
          placeholder="Cole aqui o trecho da decisão..."
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-500"
        />

        <div class="flex items-center justify-between gap-2 flex-wrap">
          <ProviderPicker v-model="provider" :providers="providers" />
          <div class="flex gap-2">
            <button
              v-if="daysBeforeAddPeriod"
              class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
              @click="undoAddPeriod"
            >
              Desfazer
            </button>
            <button
              :disabled="!addPeriodText.trim() || saving"
              class="px-4 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap"
              :class="addPeriodText.trim() && !saving
                ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
              @click="runAddPeriod"
            >
              {{ saving ? 'Acrescentando...' : 'Acrescentar' }}
            </button>
          </div>
        </div>
      </section>

      <StatusBanner :busy="busy" :notice="notice" @close="notice = null" />

      <div
        v-if="error"
        class="border border-red-700 bg-red-900/30 rounded-lg px-5 py-4 text-sm text-red-300"
      >
        {{ error }}
      </div>

      <CollapsibleBox v-if="result.warnings.length" variant="amber">
        <template #title>Avisos ({{ result.warnings.length }})</template>
        <WarningGroups :warnings="result.warnings" />
      </CollapsibleBox>

      <CollapsibleBox v-if="pageErrors.length" variant="red">
        <template #title>Erros de Página ({{ pageErrors.length }} de {{ result.pageLog.length }} páginas)</template>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Página {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </CollapsibleBox>

      <EditableTable v-model:days="editableDays" />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import EditableTable from '../../components/EditableTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import WarningGroups from '../../components/WarningGroups.vue'
import PresumeMissingPanel from '../../components/PresumeMissingPanel.vue'
import StatusBanner from '../../components/StatusBanner.vue'
import { countChangedDays } from '../../lib/days'
import { missingMonths, withoutMissing } from '../../lib/warnings'
import ProviderPicker from '../../components/ProviderPicker.vue'
import { useTimesheet } from '../../composables/useTimesheet'
import { useProviders } from '../../composables/useProviders'
import { sortByDate } from '../../lib/competence'
import type { AnalyzeTimesheetResponse, DayEntry, AIProvider } from '@hermes/types'

const route = useRoute()
const { downloadCsv, updateAnalysis, adjustDays, presumeMissing, addPeriod, error, loading: saving } = useTimesheet()
const { providers } = useProviders()
const result = ref<AnalyzeTimesheetResponse | null>(null)
const editableDays = ref<DayEntry[]>([])
const loading = ref(true)
const pageErrors = computed(() => result.value?.pageLog.filter((p) => p.status === 'error') ?? [])

interface AnalysisVersion { version: number; source: string; totalDays: number; createdAt: string }

const versions = ref<AnalysisVersion[]>([])
const showVersions = ref(true)
const restoring = ref<number | null>(null)

const SOURCE_LABEL: Record<string, string> = {
  scan:        'Leitura inicial',
  manual:      'Edição manual',
  restore:     'Restauração',
  adjust:      'Ajuste pela determinação',
  presume:     'Presunção de meses',
  'add-period': 'Período acrescentado',
  chat:        'Chat',
}

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', '')
}

async function loadVersions() {
  try {
    const { data } = await axios.get<AnalysisVersion[]>(`/api/timesheet/analyses/${route.params.id}/versions`)
    versions.value = data
  } catch {
    versions.value = []
  }
}

async function restoreVersion(version: number) {
  if (!result.value) return
  restoring.value = version
  try {
    const { data } = await axios.post<{ days: DayEntry[]; warnings: string[]; csvContent: string }>(
      `/api/timesheet/analyses/${route.params.id}/versions/${version}/restore`,
    )
    editableDays.value = sortByDate(data.days)
    result.value = { ...result.value, days: data.days, warnings: data.warnings, csvContent: data.csvContent, totalDays: data.days.length }
    notice.value = `Versão ${version} restaurada.`
    await loadVersions()
  } catch (e) {
    notice.value = axios.isAxiosError(e)
      ? (e.response?.data?.error ?? 'Falha ao restaurar a versão.')
      : 'Erro inesperado ao restaurar a versão.'
  } finally {
    restoring.value = null
  }
}

const provider = ref<AIProvider>('claude')
const showAdjust = ref(false)
const adjustText = ref('')
const adjustStartDate = ref('')
const adjustDateFrom = ref('')
const adjustDateTo = ref('')
const daysBeforeAdjust = ref<DayEntry[] | null>(null)
const showPresume = ref(false)
const daysBeforePresume = ref<{ days: DayEntry[]; warnings: string[] } | null>(null)
const showAddPeriod = ref(false)
const addPeriodText = ref('')
const daysBeforeAddPeriod = ref<{ days: DayEntry[]; warnings: string[] } | null>(null)
const missing = computed(() => missingMonths(result.value?.warnings ?? []))

const busy = ref<string | null>(null)
const notice = ref<string | null>(null)

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// Same default as HomeView: use whichever provider the user configured.
watch(providers, (val) => {
  if (!val || val[provider.value]) return
  const configured = (['claude', 'gpt', 'gemini', 'openrouter'] as const).find((k) => val[k])
  if (configured) provider.value = configured
})

onMounted(async () => {
  try {
    const { data } = await axios.get<AnalyzeTimesheetResponse>(`/api/timesheet/analyses/${route.params.id}`)
    result.value = { ...data, days: sortByDate(data.days) }
    editableDays.value = result.value.days
    await loadVersions()
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

function toBRDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Applies the judge's determination over the saved days; nothing is persisted
// until "Salvar alterações", and the snapshot allows one-click undo.
async function runAdjustment() {
  if (!adjustText.value.trim() || !result.value) return

  const snapshot = JSON.parse(JSON.stringify(editableDays.value)) as DayEntry[]
  notice.value = null
  busy.value = 'Aplicando o ajuste da determinação…'
  const adjusted = await adjustDays(
    editableDays.value,
    adjustText.value,
    adjustDateFrom.value ? toBRDate(adjustDateFrom.value) : '',
    adjustDateTo.value ? toBRDate(adjustDateTo.value) : '',
    provider.value,
    adjustStartDate.value ? toBRDate(adjustStartDate.value) : '',
  ).finally(() => { busy.value = null })
  if (!adjusted) return

  daysBeforeAdjust.value = snapshot
  showAdjust.value = false
  editableDays.value = sortByDate(adjusted.days)
  result.value = { ...result.value, warnings: [...result.value.warnings, ...adjusted.warnings] }
  notice.value = `Ajuste aplicado: ${plural(countChangedDays(snapshot, editableDays.value), 'dia alterado', 'dias alterados')}. Confira a tabela e salve para gravar.`
}

// Fills the months the defendant never attached; persisted only on "Salvar alterações".
async function runPresume(months: string[], text: string) {
  if (!result.value) return
  const snapshot = { days: JSON.parse(JSON.stringify(editableDays.value)) as DayEntry[], warnings: [...result.value.warnings] }
  notice.value = null
  busy.value = 'Presumindo os meses faltantes…'
  const presumed = await presumeMissing(editableDays.value, months, text, provider.value).finally(() => { busy.value = null })
  if (!presumed) return

  daysBeforePresume.value = snapshot
  showPresume.value = false
  editableDays.value = sortByDate(presumed.days)
  result.value = { ...result.value, warnings: [...withoutMissing(result.value.warnings, months), ...presumed.warnings] }
  notice.value = `Meses presumidos: ${months.join(', ')} — ${plural(countChangedDays(snapshot.days, editableDays.value), 'dia gerado', 'dias gerados')}. Confira a tabela e salve para gravar.`
}

function undoPresume() {
  if (!daysBeforePresume.value || !result.value) return
  editableDays.value = daysBeforePresume.value.days
  result.value = { ...result.value, warnings: daysBeforePresume.value.warnings }
  daysBeforePresume.value = null
  notice.value = 'Presunção desfeita.'
}

// Adds the period stated in the determination; days already on the table keep
// their punches. Persisted only on "Salvar alterações".
async function runAddPeriod() {
  if (!addPeriodText.value.trim() || !result.value) return
  const snapshot = { days: JSON.parse(JSON.stringify(editableDays.value)) as DayEntry[], warnings: [...result.value.warnings] }
  notice.value = null
  busy.value = 'Acrescentando o período…'
  const added = await addPeriod(editableDays.value, addPeriodText.value, provider.value).finally(() => { busy.value = null })
  if (!added) return

  daysBeforeAddPeriod.value = snapshot
  showAddPeriod.value = false
  editableDays.value = sortByDate(added.days)
  result.value = { ...result.value, warnings: [...result.value.warnings, ...added.warnings] }
  notice.value = `Período acrescentado: ${plural(countChangedDays(snapshot.days, editableDays.value), 'dia gerado', 'dias gerados')}. Confira a tabela e salve para gravar.`
}

function undoAddPeriod() {
  if (!daysBeforeAddPeriod.value || !result.value) return
  editableDays.value = daysBeforeAddPeriod.value.days
  result.value = { ...result.value, warnings: daysBeforeAddPeriod.value.warnings }
  daysBeforeAddPeriod.value = null
  notice.value = 'Período desfeito.'
}

function undoAdjust() {
  if (!daysBeforeAdjust.value) return
  editableDays.value = daysBeforeAdjust.value
  daysBeforeAdjust.value = null
  notice.value = 'Ajuste desfeito.'
}

async function handleSave() {
  if (!result.value) return
  const updated = await updateAnalysis(Number(route.params.id), editableDays.value, result.value.warnings)
  if (!updated || !result.value) return
  result.value = { ...result.value, days: editableDays.value, csvContent: updated.csvContent, totalDays: editableDays.value.length }
  notice.value = 'Alterações salvas.'
  await loadVersions()
}
</script>
