<template>
  <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-700">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-xs font-semibold tracking-widest uppercase text-zinc-400"
            :class="col.align === 'right' ? 'text-right' : 'text-left'"
          >
            <button
              class="inline-flex items-center gap-1 hover:text-zinc-100 transition-colors"
              :title="copiedColumn === col.key ? 'Copied!' : 'Copy column'"
              @click.stop="copyColumn(col.key, payslips.map(col.value))"
            >
              {{ col.label }}
              <span class="normal-case">{{ copiedColumn === col.key ? '✓' : '⧉' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(p, i) in payslips"
          :key="i"
          class="border-b border-zinc-700/60 last:border-0 cursor-pointer transition-colors"
          :class="modelValue === i ? 'bg-zinc-700/50' : 'hover:bg-zinc-700/30'"
          @click="$emit('update:modelValue', i)"
        >
          <td class="px-4 py-3 font-mono text-xs text-zinc-200">{{ p.competence || '—' }}</td>
          <td class="px-4 py-3 text-xs text-zinc-300">{{ p.employeeName || '—' }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-300 text-right">{{ formatCurrency(p.baseSalary) }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-300 text-right">{{ formatCurrency(p.totalEarnings) }}</td>
          <td class="px-4 py-3 font-mono text-xs text-red-400 text-right">- {{ formatCurrency(p.totalDeductions) }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-100 font-semibold text-right">{{ formatCurrency(p.netSalary) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useCopyColumn } from '../composables/useCopyColumn'
import type { Payslip } from '@hermes/types'

defineProps<{ payslips: Payslip[]; modelValue: number }>()
defineEmits<{ (e: 'update:modelValue', value: number): void }>()

const { copiedColumn, copyColumn } = useCopyColumn()

const columns: { key: string; label: string; align?: 'right'; value: (p: Payslip) => string }[] = [
  { key: 'competence', label: 'Competence', value: (p) => p.competence ?? '' },
  { key: 'employeeName', label: 'Employee', value: (p) => p.employeeName ?? '' },
  { key: 'baseSalary', label: 'Base Salary', align: 'right', value: (p) => String(p.baseSalary ?? '') },
  { key: 'totalEarnings', label: 'Earnings', align: 'right', value: (p) => String(p.totalEarnings ?? '') },
  { key: 'totalDeductions', label: 'Deductions', align: 'right', value: (p) => String(p.totalDeductions ?? '') },
  { key: 'netSalary', label: 'Net Salary', align: 'right', value: (p) => String(p.netSalary ?? '') },
]

function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>
