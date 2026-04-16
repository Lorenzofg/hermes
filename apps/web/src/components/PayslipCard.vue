<template>
  <div class="space-y-4">

    <!-- Identification -->
    <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Employee</p>
        <p class="text-sm text-zinc-100 font-medium">{{ payslip.employeeName || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">CPF</p>
        <p class="text-sm text-zinc-100 font-mono">{{ payslip.cpf || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Role</p>
        <p class="text-sm text-zinc-100">{{ payslip.role || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Competence</p>
        <p class="text-sm text-zinc-100 font-mono">{{ payslip.competence || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Admission</p>
        <p class="text-sm text-zinc-100 font-mono">{{ payslip.admissionDate || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Base Salary</p>
        <p class="text-sm text-zinc-100 font-mono">{{ formatCurrency(payslip.baseSalary) }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

      <!-- Earnings -->
      <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-zinc-700">
          <h3 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Earnings</h3>
        </div>
        <table class="w-full text-xs">
          <tbody>
            <tr
              v-for="(item, i) in (payslip.earnings ?? [])"
              :key="i"
              class="border-b border-zinc-700/50 last:border-0"
            >
              <td class="px-4 py-2 text-zinc-300">{{ item.description }}</td>
              <td class="px-4 py-2 text-zinc-500 text-center">{{ item.reference }}</td>
              <td class="px-4 py-2 text-zinc-200 font-mono text-right">{{ formatCurrency(item.value) }}</td>
            </tr>
            <tr v-if="!payslip.earnings?.length">
              <td class="px-4 py-3 text-zinc-600" colspan="3">No earnings</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-zinc-600 bg-zinc-700/30">
              <td class="px-4 py-2 text-zinc-400 font-semibold" colspan="2">Total Earnings</td>
              <td class="px-4 py-2 text-zinc-100 font-mono font-semibold text-right">{{ formatCurrency(payslip.totalEarnings) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Deductions -->
      <div class="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-zinc-700">
          <h3 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Deductions</h3>
        </div>
        <table class="w-full text-xs">
          <tbody>
            <tr
              v-for="(item, i) in (payslip.deductions ?? [])"
              :key="i"
              class="border-b border-zinc-700/50 last:border-0"
            >
              <td class="px-4 py-2 text-zinc-300">{{ item.description }}</td>
              <td class="px-4 py-2 text-zinc-500 text-center">{{ item.reference }}</td>
              <td class="px-4 py-2 text-red-400 font-mono text-right">- {{ formatCurrency(item.value) }}</td>
            </tr>
            <tr v-if="!payslip.deductions?.length">
              <td class="px-4 py-3 text-zinc-600" colspan="3">No deductions</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-zinc-600 bg-zinc-700/30">
              <td class="px-4 py-2 text-zinc-400 font-semibold" colspan="2">Total Deductions</td>
              <td class="px-4 py-2 text-red-400 font-mono font-semibold text-right">- {{ formatCurrency(payslip.totalDeductions) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Totals -->
    <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-5 flex flex-wrap gap-6">
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Net Salary</p>
        <p class="text-lg font-semibold font-mono text-zinc-100">{{ formatCurrency(payslip.netSalary) }}</p>
      </div>
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">FGTS Base</p>
        <p class="text-lg font-semibold font-mono text-zinc-100">{{ formatCurrency(payslip.fgtsBase) }}</p>
      </div>
      <div>
        <p class="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">FGTS</p>
        <p class="text-lg font-semibold font-mono text-zinc-100">{{ formatCurrency(payslip.fgtsAmount) }}</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { Payslip } from '@hermes/types'

defineProps<{ payslip: Payslip }>()

function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>
