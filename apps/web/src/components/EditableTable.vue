<template>
  <div class="bg-zinc-800 border border-zinc-700 rounded-lg">
    <div v-if="editableDays.length" class="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-700">
      <button
        :disabled="page === 0"
        class="px-3 py-1 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-40 whitespace-nowrap"
        @click="page--"
      >
        ‹ Anterior
      </button>
      <select
        v-model="page"
        aria-label="Página"
        class="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 min-w-0"
      >
        <option v-for="(p, i) in pages" :key="i" :value="i">{{ p.label }}</option>
      </select>
      <button
        class="px-3 py-1 text-xs font-semibold border border-red-800 text-red-400 rounded hover:bg-red-900/40 transition-colors whitespace-nowrap"
        @click="removeMonth"
      >
        Excluir mês
      </button>
      <button
        :disabled="page === pageCount - 1"
        class="px-3 py-1 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-40 whitespace-nowrap"
        @click="page++"
      >
        Próxima ›
      </button>
    </div>

    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-700">
          <th class="px-2 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">
            <button
              class="flex items-center gap-1 hover:text-zinc-100 transition-colors"
              :title="copiedColumn === 'date' ? 'Copiado!' : 'Copiar coluna'"
              @click="copyColumn('date', editableDays.map((d) => d.date))"
            >
              Data
              <span class="normal-case">{{ copiedColumn === 'date' ? '✓' : '⧉' }}</span>
            </button>
          </th>
          <template v-for="i in 6" :key="i">
            <th class="px-1 py-3 text-center text-xs font-semibold tracking-widest uppercase text-zinc-400">
              <button
                class="inline-flex items-center gap-1 hover:text-zinc-100 transition-colors"
                :title="copiedColumn === `in${i}` ? 'Copiado!' : 'Copiar coluna'"
                @click="copyColumn(`in${i}`, editableDays.map((d) => d.shifts[i - 1].clockIn))"
              >
                Entrada {{ i }}
                <span class="normal-case">{{ copiedColumn === `in${i}` ? '✓' : '⧉' }}</span>
              </button>
            </th>
            <th class="px-1 py-3 text-center text-xs font-semibold tracking-widest uppercase text-zinc-400">
              <button
                class="inline-flex items-center gap-1 hover:text-zinc-100 transition-colors"
                :title="copiedColumn === `out${i}` ? 'Copiado!' : 'Copiar coluna'"
                @click="copyColumn(`out${i}`, editableDays.map((d) => d.shifts[i - 1].clockOut))"
              >
                Saída {{ i }}
                <span class="normal-case">{{ copiedColumn === `out${i}` ? '✓' : '⧉' }}</span>
              </button>
            </th>
          </template>
          <th class="px-1 py-3"><span class="sr-only">Excluir</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(day, idx) in pageDays"
          :key="(pages[page]?.start ?? 0) + idx"
          class="border-b border-zinc-700/60 last:border-0"
          :class="idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-700/20'"
        >
          <td class="px-2 py-2">
            <input
              v-model="day.date"
              type="text"
              placeholder="dd/MM/yyyy"
              class="w-full min-w-[96px] bg-zinc-700 border border-zinc-600 rounded px-1.5 py-1 text-xs font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
            />
          </td>

          <template v-for="t in 6" :key="t">
            <td class="px-1 py-2">
              <input
                v-model="day.shifts[t - 1].clockIn"
                type="text"
                placeholder="HH:mm"
                class="w-full min-w-[52px] bg-zinc-700 border border-zinc-600 rounded px-1 py-1 text-xs font-mono text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
              />
            </td>
            <td class="px-1 py-2">
              <input
                v-model="day.shifts[t - 1].clockOut"
                type="text"
                placeholder="HH:mm"
                class="w-full min-w-[52px] bg-zinc-700 border border-zinc-600 rounded px-1 py-1 text-xs font-mono text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
              />
            </td>
          </template>
          <td class="px-1 py-2 text-center">
            <button
              class="text-zinc-500 hover:text-red-400 transition-colors px-1"
              :title="`Excluir ${day.date || 'linha'}`"
              :aria-label="`Excluir ${day.date || 'linha'}`"
              @click="removeRow(idx)"
            >
              ✕
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <div v-if="pageCount > 1" class="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-zinc-700">
      <button
        :disabled="page === 0"
        class="px-3 py-1 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-40 whitespace-nowrap"
        @click="page--"
      >
        ‹ Anterior
      </button>
      <select
        v-model="page"
        aria-label="Página"
        class="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 min-w-0"
      >
        <option v-for="(p, i) in pages" :key="i" :value="i">{{ p.label }}</option>
      </select>
      <button
        :disabled="page === pageCount - 1"
        class="px-3 py-1 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors disabled:opacity-40 whitespace-nowrap"
        @click="page++"
      >
        Próxima ›
      </button>
    </div>

    <div class="px-4 py-3 border-t border-zinc-700">
      <button
        class="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
        @click="addDay"
      >
        + Adicionar linha
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue'
import { useCopyColumn } from '../composables/useCopyColumn'
import { monthPages } from '../lib/days'
import type { DayEntry, Shift } from '@hermes/types'

const props = defineProps<{ days: DayEntry[] }>()

const emit = defineEmits<{
  (e: 'update:days', days: DayEntry[]): void
}>()

function padShifts(shifts: Shift[]): Shift[] {
  const copy = shifts.map((s) => ({ ...s }))
  while (copy.length < 6) copy.push({ clockIn: '', clockOut: '' })
  return copy
}

const editableDays = ref<DayEntry[]>(
  props.days.map((d) => ({ date: d.date, shifts: padShifts(d.shifts) })),
)

watch(editableDays, (val) => emit('update:days', val), { deep: true })

// The parent echoes back the array emitted above; any other array means the
// days were replaced from outside (adjust, presume, undo) — show those.
watch(() => props.days, (days) => {
  if (toRaw(days) === toRaw(editableDays.value)) return
  editableDays.value = days.map((d) => ({ date: d.date, shifts: padShifts(d.shifts) }))
})

// One calendar month per page — rendering every day of a multi-year card at
// once means thousands of inputs, which makes the page sluggish.
const page = ref(0)
const pages = computed(() => monthPages(editableDays.value.map((d) => d.date)))
const pageCount = computed(() => Math.max(1, pages.value.length))
const pageDays = computed(() => {
  const p = pages.value[page.value]
  return p ? editableDays.value.slice(p.start, p.end) : []
})
// stay on a valid page when days are removed
watch(pageCount, (n) => { if (page.value > n - 1) page.value = n - 1 })

// Deletes only from the table; nothing is saved until the parent's save.
function removeRow(idx: number) {
  editableDays.value.splice((pages.value[page.value]?.start ?? 0) + idx, 1)
}

function removeMonth() {
  const p = pages.value[page.value]
  if (!p || !confirm(`Excluir ${p.label} da tabela?`)) return
  editableDays.value.splice(p.start, p.end - p.start)
}

function addDay() {
  editableDays.value.push({
    date: '',
    shifts: Array.from({ length: 6 }, () => ({ clockIn: '', clockOut: '' })),
  })
  page.value = pageCount.value - 1 // show the new row
}

const { copiedColumn, copyColumn } = useCopyColumn()
</script>
