<template>
  <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-700">
          <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400">Date</th>
          <th
            v-for="i in 6"
            :key="i"
            class="px-4 py-3 text-center text-xs font-semibold tracking-widest uppercase text-zinc-400"
          >
            Shift {{ i }}
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
import type { AnalyzeTimesheetResponse } from '@hermes/types'

defineProps<{
  result: AnalyzeTimesheetResponse
}>()
</script>
