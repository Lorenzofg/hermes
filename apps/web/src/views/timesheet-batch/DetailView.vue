<template>
  <div class="space-y-6">

    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">
        Lote #{{ route.params.id }}
      </h2>
      <RouterLink
        to="/history"
        class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
      >
        Voltar
      </RouterLink>
    </div>

    <div v-if="loading" class="text-sm text-zinc-500">Carregando...</div>
    <div v-else-if="!analysis" class="text-sm text-red-400">Análise não encontrada.</div>

    <template v-else>
      <p class="text-xs text-zinc-500">
        {{ analysis.fileName }} — {{ analysis.totalPeople }} pessoas — {{ analysis.provider.toUpperCase() }}
      </p>

      <CollapsibleBox v-if="pageErrors.length" variant="red">
        <template #title>Erros de Página ({{ pageErrors.length }} de {{ analysis.pageLog.length }} páginas)</template>
        <div v-for="e in pageErrors" :key="e.page" class="text-sm text-red-300">
          <p class="font-semibold">Página {{ e.page }}</p>
          <p class="text-xs text-red-400/80 whitespace-pre-wrap break-words">{{ e.detail }}</p>
        </div>
      </CollapsibleBox>

      <div class="space-y-3">
        <div
          v-for="person in analysis.people"
          :key="person.id"
          class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
        >
          <div
            class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-700/40 transition-colors"
            @click="togglePerson(person.id)"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-zinc-200">{{ person.personName }}</span>
              <span class="text-xs text-zinc-500">{{ person.totalDays }} dias</span>
              <span v-if="person.warnings.length" class="text-xs text-amber-400">
                {{ person.warnings.length }} aviso{{ person.warnings.length !== 1 ? 's' : '' }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <button
                class="text-xs font-semibold text-zinc-300 hover:text-white transition-colors underline underline-offset-2"
                :disabled="saving"
                @click.stop="handleSavePerson(person)"
              >
                {{ saving ? 'Salvando...' : 'Salvar' }}
              </button>
              <button
                class="text-xs font-semibold text-zinc-300 hover:text-white transition-colors underline underline-offset-2"
                @click.stop="downloadPersonCsv(Number(route.params.id), person.id, person.personName)"
              >
                Exportar CSV
              </button>
              <span class="text-xs text-zinc-500">{{ expanded.has(person.id) ? '▲' : '▼' }}</span>
            </div>
          </div>

          <div v-if="expanded.has(person.id)" class="border-t border-zinc-700 p-4 space-y-3">
            <div
              v-if="person.warnings.length"
              class="border border-amber-800 bg-amber-900/20 rounded px-3 py-2"
            >
              <p class="text-xs font-semibold tracking-wide uppercase text-amber-500 mb-1">Avisos</p>
              <ul class="space-y-0.5">
                <li v-for="(w, j) in person.warnings" :key="j" class="text-xs text-amber-400">— {{ w }}</li>
              </ul>
            </div>

            <EditableTable v-model:days="person.days" />
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import EditableTable from '../../components/EditableTable.vue'
import CollapsibleBox from '../../components/CollapsibleBox.vue'
import { useBatchTimesheet } from '../../composables/useBatchTimesheet'
import { sortByDate } from '../../lib/competence'
import type { DayEntry, PageLogEntry } from '@hermes/types'

interface PersonDetail {
  id: number
  personName: string
  totalDays: number
  csvContent: string
  warnings: string[]
  days: DayEntry[]
}

interface BatchAnalysis {
  id: number
  fileName: string
  provider: string
  totalPeople: number
  pageLog: PageLogEntry[]
  people: PersonDetail[]
}

const route    = useRoute()
const { downloadPersonCsv, updatePersonDays, loading: saving } = useBatchTimesheet()
const loading  = ref(true)
const analysis = ref<BatchAnalysis | null>(null)
const expanded = ref<Set<number>>(new Set())
const pageErrors = computed(() => analysis.value?.pageLog.filter((p) => p.status === 'error') ?? [])

onMounted(async () => {
  try {
    const { data } = await axios.get<BatchAnalysis>(`/api/timesheet-batch/analyses/${route.params.id}`)
    analysis.value = { ...data, people: data.people.map((p) => ({ ...p, days: sortByDate(p.days) })) }
  } catch {
    analysis.value = null
  } finally {
    loading.value = false
  }
})

function togglePerson(id: number) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
  }
}

async function handleSavePerson(person: PersonDetail) {
  const updated = await updatePersonDays(Number(route.params.id), person.id, person.days)
  if (!updated) return
  person.csvContent = updated.csvContent
  person.totalDays = person.days.length
}
</script>
