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
              @click="copyColumn(col.key, payslips.map(col.value))"
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
          class="border-b border-zinc-700/60 last:border-0"
        >
          <td class="px-4 py-3 font-mono text-xs text-zinc-200 whitespace-nowrap">{{ p.competence || '—' }}</td>
          <td class="px-4 py-3 text-xs text-zinc-300 whitespace-nowrap">{{ p.employeeName || '—' }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-300 whitespace-nowrap">{{ p.cpf || '—' }}</td>
          <td class="px-4 py-3 text-xs text-zinc-300 whitespace-nowrap">{{ p.role || '—' }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-300 whitespace-nowrap">{{ p.admissionDate || '—' }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-300 text-right whitespace-nowrap">{{ formatCurrency(p.baseSalary) }}</td>

          <td class="px-4 py-3 text-xs text-zinc-300">
            <div v-if="p.earnings?.length" class="space-y-0.5">
              <div v-for="(item, ei) in p.earnings" :key="ei" class="whitespace-nowrap">
                {{ item.description }}<span v-if="item.reference" class="text-zinc-500"> ({{ item.reference }})</span>: {{ formatCurrency(item.value) }}
              </div>
            </div>
            <span v-else class="text-zinc-600">—</span>
          </td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-100 font-semibold text-right whitespace-nowrap">{{ formatCurrency(p.totalEarnings) }}</td>

          <td class="px-4 py-3 text-xs text-red-400">
            <div v-if="p.deductions?.length" class="space-y-0.5">
              <div v-for="(item, di) in p.deductions" :key="di" class="whitespace-nowrap">
                {{ item.description }}<span v-if="item.reference" class="text-red-400/60"> ({{ item.reference }})</span>: - {{ formatCurrency(item.value) }}
              </div>
            </div>
            <span v-else class="text-zinc-600">—</span>
          </td>
          <td class="px-4 py-3 font-mono text-xs text-red-400 font-semibold text-right whitespace-nowrap">- {{ formatCurrency(p.totalDeductions) }}</td>

          <td class="px-4 py-3 font-mono text-xs text-zinc-100 font-semibold text-right whitespace-nowrap">{{ formatCurrency(p.netSalary) }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-300 text-right whitespace-nowrap">{{ formatCurrency(p.fgtsBase) }}</td>
          <td class="px-4 py-3 font-mono text-xs text-zinc-300 text-right whitespace-nowrap">{{ formatCurrency(p.fgtsAmount) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useCopyColumn } from '../composables/useCopyColumn'
import type { Payslip } from '@hermes/types'

defineProps<{ payslips: Payslip[] }>()

const { copiedColumn, copyColumn } = useCopyColumn()

function itemsToText(items: { description: string; reference: string; value: number }[] | undefined): string {
  return (items ?? []).map((it) => `${it.description}${it.reference ? ` (${it.reference})` : ''}: ${it.value}`).join('; ')
}

const columns: { key: string; label: string; align?: 'right'; value: (p: Payslip) => string }[] = [
  { key: 'competence', label: 'Competence', value: (p) => p.competence ?? '' },
  { key: 'employeeName', label: 'Employee', value: (p) => p.employeeName ?? '' },
  { key: 'cpf', label: 'CPF', value: (p) => p.cpf ?? '' },
  { key: 'role', label: 'Role', value: (p) => p.role ?? '' },
  { key: 'admissionDate', label: 'Admission', value: (p) => p.admissionDate ?? '' },
  { key: 'baseSalary', label: 'Base Salary', align: 'right', value: (p) => String(p.baseSalary ?? '') },
  { key: 'earnings', label: 'Earnings', value: (p) => itemsToText(p.earnings) },
  { key: 'totalEarnings', label: 'Total Earnings', align: 'right', value: (p) => String(p.totalEarnings ?? '') },
  { key: 'deductions', label: 'Deductions', value: (p) => itemsToText(p.deductions) },
  { key: 'totalDeductions', label: 'Total Deductions', align: 'right', value: (p) => String(p.totalDeductions ?? '') },
  { key: 'netSalary', label: 'Net Salary', align: 'right', value: (p) => String(p.netSalary ?? '') },
  { key: 'fgtsBase', label: 'FGTS Base', align: 'right', value: (p) => String(p.fgtsBase ?? '') },
  { key: 'fgtsAmount', label: 'FGTS', align: 'right', value: (p) => String(p.fgtsAmount ?? '') },
]

function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>
