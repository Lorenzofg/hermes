<template>
  <div class="space-y-6">

    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
        Cartão de Ponto #{{ route.params.id }}
      </h2>
      <div class="flex gap-2">
        <RouterLink
          to="/history"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
        >
          Voltar
        </RouterLink>
        <button
          v-if="result"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Salvando...' : 'Salvar alterações' }}
        </button>
        <button
          v-if="result"
          class="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded hover:bg-zinc-100 transition-colors"
          @click="handleDownload"
        >
          Exportar CSV
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-zinc-500">Carregando...</div>
    <div v-else-if="!result" class="text-sm text-red-400">Análise não encontrada.</div>

    <template v-else>
      <CollapsibleBox v-if="result.warnings.length" variant="amber">
        <template #title>Avisos ({{ result.warnings.length }})</template>
        <ul class="space-y-1">
          <li v-for="(w, i) in result.warnings" :key="i" class="text-sm text-amber-300">— {{ w }}</li>
        </ul>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import EditableTable from '../../components/EditableTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import { useTimesheet } from '../../composables/useTimesheet'
import { sortByDate } from '../../lib/competence'
import type { AnalyzeTimesheetResponse, DayEntry } from '@hermes/types'

const route = useRoute()
const { downloadCsv, updateAnalysis, loading: saving } = useTimesheet()
const result = ref<AnalyzeTimesheetResponse | null>(null)
const editableDays = ref<DayEntry[]>([])
const loading = ref(true)
const pageErrors = computed(() => result.value?.pageLog.filter((p) => p.status === 'error') ?? [])

onMounted(async () => {
  try {
    const { data } = await axios.get<AnalyzeTimesheetResponse>(`/api/timesheet/analyses/${route.params.id}`)
    result.value = { ...data, days: sortByDate(data.days) }
    editableDays.value = result.value.days
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

async function handleSave() {
  const updated = await updateAnalysis(Number(route.params.id), editableDays.value)
  if (!updated || !result.value) return
  result.value = { ...result.value, days: editableDays.value, csvContent: updated.csvContent, totalDays: editableDays.value.length }
}
</script>
