<template>
  <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-zinc-700">
          <th
            v-for="col in fixedColumns"
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

          <th
            v-for="desc in earningKeys"
            :key="`e:${desc}`"
            class="px-4 py-3 text-xs font-semibold tracking-widest uppercase text-emerald-500/80 text-right"
          >
            <button
              class="inline-flex items-center gap-1 hover:text-zinc-100 transition-colors"
              :title="copiedColumn === `e:${desc}` ? 'Copied!' : 'Copy column'"
              @click="copyColumn(`e:${desc}`, payslips.map((p) => String(findItem(p.earnings, desc)?.value ?? '')))"
            >
              {{ desc }}
              <span class="normal-case">{{ copiedColumn === `e:${desc}` ? '✓' : '⧉' }}</span>
            </button>
          </th>

          <th
            v-for="desc in deductionKeys"
            :key="`d:${desc}`"
            class="px-4 py-3 text-xs font-semibold tracking-widest uppercase text-red-400/80 text-right"
          >
            <button
              class="inline-flex items-center gap-1 hover:text-zinc-100 transition-colors"
              :title="copiedColumn === `d:${desc}` ? 'Copied!' : 'Copy column'"
              @click="copyColumn(`d:${desc}`, payslips.map((p) => String(findItem(p.deductions, desc)?.value ?? '')))"
            >
              {{ desc }}
              <span class="normal-case">{{ copiedColumn === `d:${desc}` ? '✓' : '⧉' }}</span>
            </button>
          </th>

          <th
            v-for="col in totalColumns"
            :key="col.key"
            class="px-4 py-3 text-xs font-semibold tracking-widest uppercase text-zinc-400 text-right"
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

          <td
            v-for="desc in earningKeys"
            :key="`e:${desc}`"
            class="px-4 py-3 font-mono text-xs text-zinc-200 text-right whitespace-nowrap"
          >
            <template v-if="findItem(p.earnings, desc)">
              {{ formatCurrency(findItem(p.earnings, desc)!.value) }}
              <span v-if="findItem(p.earnings, desc)!.reference" class="text-zinc-500"> ({{ findItem(p.earnings, desc)!.reference }})</span>
            </template>
            <span v-else class="text-zinc-600">—</span>
          </td>

          <td
            v-for="desc in deductionKeys"
            :key="`d:${desc}`"
            class="px-4 py-3 font-mono text-xs text-red-400 text-right whitespace-nowrap"
          >
            <template v-if="findItem(p.deductions, desc)">
              - {{ formatCurrency(findItem(p.deductions, desc)!.value) }}
              <span v-if="findItem(p.deductions, desc)!.reference" class="text-red-400/60"> ({{ findItem(p.deductions, desc)!.reference }})</span>
            </template>
            <span v-else class="text-zinc-600">—</span>
          </td>

          <td class="px-4 py-3 font-mono text-xs text-zinc-100 font-semibold text-right whitespace-nowrap">{{ formatCurrency(p.totalEarnings) }}</td>
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
import { computed } from 'vue'
import { useCopyColumn } from '../composables/useCopyColumn'
import type { Payslip, PayslipEarning, PayslipDeduction } from '@hermes/types'

const props = defineProps<{ payslips: Payslip[] }>()

const { copiedColumn, copyColumn } = useCopyColumn()

function findItem<T extends { description: string }>(items: T[] | undefined, description: string): T | undefined {
  return items?.find((it) => it.description === description)
}

// Each distinct earning/deduction description becomes its own column, in
// first-seen order, so a calculista can scan/copy a single verba across
// every payslip instead of hunting through a joined text list per row.
function uniqueDescriptions(items: (PayslipEarning | PayslipDeduction)[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    if (!seen.has(item.description)) {
      seen.add(item.description)
      result.push(item.description)
    }
  }
  return result
}

const earningKeys   = computed(() => uniqueDescriptions(props.payslips.flatMap((p) => p.earnings ?? [])))
const deductionKeys = computed(() => uniqueDescriptions(props.payslips.flatMap((p) => p.deductions ?? [])))

const fixedColumns: { key: string; label: string; align?: 'right'; value: (p: Payslip) => string }[] = [
  { key: 'competence', label: 'Competence', value: (p) => p.competence ?? '' },
  { key: 'employeeName', label: 'Employee', value: (p) => p.employeeName ?? '' },
  { key: 'cpf', label: 'CPF', value: (p) => p.cpf ?? '' },
  { key: 'role', label: 'Role', value: (p) => p.role ?? '' },
  { key: 'admissionDate', label: 'Admission', value: (p) => p.admissionDate ?? '' },
  { key: 'baseSalary', label: 'Base Salary', align: 'right', value: (p) => String(p.baseSalary ?? '') },
]

const totalColumns: { key: string; label: string; align?: 'right'; value: (p: Payslip) => string }[] = [
  { key: 'totalEarnings', label: 'Total Earnings', align: 'right', value: (p) => String(p.totalEarnings ?? '') },
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
