<template>
  <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-700">
          <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">
            <button
              class="flex items-center gap-1 hover:text-zinc-100 transition-colors"
              :title="copiedColumn === 'date' ? 'Copiado!' : 'Copiar coluna'"
              @click="copyColumn('date', result.days.map((d) => d.date))"
            >
              Data
              <span class="normal-case">{{ copiedColumn === 'date' ? '✓' : '⧉' }}</span>
            </button>
          </th>
          <th
            v-for="i in 6"
            :key="i"
            class="px-4 py-3 text-center text-xs font-semibold tracking-widest uppercase text-zinc-400"
          >
            <div>Turno {{ i }}</div>
            <div class="flex items-center justify-center gap-2 mt-0.5 normal-case font-normal">
              <button
                class="text-[10px] text-zinc-500 hover:text-zinc-100 transition-colors"
                :title="copiedColumn === `in${i}` ? 'Copiado!' : 'Copiar coluna Entrada'"
                @click="copyColumn(`in${i}`, result.days.map((d) => d.shifts[i - 1]?.clockIn ?? ''))"
              >
                {{ copiedColumn === `in${i}` ? '✓ entrada' : 'entrada ⧉' }}
              </button>
              <button
                class="text-[10px] text-zinc-500 hover:text-zinc-100 transition-colors"
                :title="copiedColumn === `out${i}` ? 'Copiado!' : 'Copiar coluna Saída'"
                @click="copyColumn(`out${i}`, result.days.map((d) => d.shifts[i - 1]?.clockOut ?? ''))"
              >
                {{ copiedColumn === `out${i}` ? '✓ saída' : 'saída ⧉' }}
              </button>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(day, idx) in result.days"
          :key="day.date"
          class="border-b border-zinc-700/60 last:border-0 hover:bg-zinc-700/40 transition-colors"
          :class="idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-700/20'"
        >
          <td class="px-4 py-3 font-mono text-xs text-zinc-300">{{ day.date }}</td>
          <td
            v-for="i in 6"
            :key="i"
            class="px-4 py-3 text-center font-mono text-xs"
          >
            <span
              v-if="day.shifts[i - 1] && (day.shifts[i - 1].clockIn || day.shifts[i - 1].clockOut)"
              class="text-zinc-200"
            >
              {{ day.shifts[i - 1].clockIn || '—' }}
              <span class="text-zinc-500 mx-1">/</span>
              {{ day.shifts[i - 1].clockOut || '—' }}
            </span>
            <span v-else class="text-zinc-600">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useCopyColumn } from '../composables/useCopyColumn'
import type { AnalyzeTimesheetResponse } from '@hermes/types'

defineProps<{
  result: AnalyzeTimesheetResponse
}>()

const { copiedColumn, copyColumn } = useCopyColumn()
</script>
