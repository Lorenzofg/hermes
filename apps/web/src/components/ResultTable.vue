<template>
  <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-700">
          <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">
            <button
              class="flex items-center gap-1 hover:text-zinc-100 transition-colors"
              :title="copiedColumn === 'date' ? 'Copied!' : 'Copy column'"
              @click="copyColumn('date', result.days.map((d) => d.date))"
            >
              Date
              <span class="normal-case">{{ copiedColumn === 'date' ? '✓' : '⧉' }}</span>
            </button>
          </th>
          <th
            v-for="i in 6"
            :key="i"
            class="px-4 py-3 text-center text-xs font-semibold tracking-widest uppercase text-zinc-400"
          >
            <div>Shift {{ i }}</div>
            <div class="flex items-center justify-center gap-2 mt-0.5 normal-case font-normal">
              <button
                class="text-[10px] text-zinc-500 hover:text-zinc-100 transition-colors"
                :title="copiedColumn === `in${i}` ? 'Copied!' : 'Copy In column'"
                @click="copyColumn(`in${i}`, result.days.map((d) => d.shifts[i - 1]?.clockIn ?? ''))"
              >
                {{ copiedColumn === `in${i}` ? '✓ in' : 'in ⧉' }}
              </button>
              <button
                class="text-[10px] text-zinc-500 hover:text-zinc-100 transition-colors"
                :title="copiedColumn === `out${i}` ? 'Copied!' : 'Copy Out column'"
                @click="copyColumn(`out${i}`, result.days.map((d) => d.shifts[i - 1]?.clockOut ?? ''))"
              >
                {{ copiedColumn === `out${i}` ? '✓ out' : 'out ⧉' }}
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
import { ref } from 'vue'
import type { AnalyzeTimesheetResponse } from '@hermes/types'

defineProps<{
  result: AnalyzeTimesheetResponse
}>()

const copiedColumn = ref<string | null>(null)
let copiedTimeout: ReturnType<typeof setTimeout> | undefined

async function copyColumn(key: string, values: string[]) {
  const text = values.join('\n')

  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback for browsers/contexts without Clipboard API access
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  copiedColumn.value = key
  clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => { copiedColumn.value = null }, 1500)
}
</script>
