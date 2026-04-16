<template>
  <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-700">
          <th class="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase text-zinc-400 w-32">
            Date
          </th>
          <template v-for="i in 6" :key="i">
            <th class="px-2 py-3 text-center text-xs font-semibold tracking-widest uppercase text-zinc-400">
              In {{ i }}
            </th>
            <th class="px-2 py-3 text-center text-xs font-semibold tracking-widest uppercase text-zinc-400">
              Out {{ i }}
            </th>
          </template>
          <th class="px-3 py-3 w-10"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(day, idx) in editableDays"
          :key="idx"
          class="border-b border-zinc-700/60 last:border-0"
          :class="idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-700/20'"
        >
          <td class="px-4 py-2">
            <input
              v-model="day.date"
              type="text"
              placeholder="dd/MM/yyyy"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
            />
          </td>

          <template v-for="t in 6" :key="t">
            <td class="px-2 py-2">
              <input
                v-model="day.shifts[t - 1].clockIn"
                type="text"
                placeholder="HH:mm"
                class="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs font-mono text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
              />
            </td>
            <td class="px-2 py-2">
              <input
                v-model="day.shifts[t - 1].clockOut"
                type="text"
                placeholder="HH:mm"
                class="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs font-mono text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
              />
            </td>
          </template>

          <td class="px-3 py-2 text-center">
            <button
              class="text-zinc-600 hover:text-red-400 transition-colors text-xs"
              @click="removeDay(idx)"
            >
              ✕
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="px-4 py-3 border-t border-zinc-700">
      <button
        class="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
        @click="addDay"
      >
        + Add row
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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

function addDay() {
  editableDays.value.push({
    date: '',
    shifts: Array.from({ length: 6 }, () => ({ clockIn: '', clockOut: '' })),
  })
}

function removeDay(idx: number) {
  editableDays.value.splice(idx, 1)
}
</script>
