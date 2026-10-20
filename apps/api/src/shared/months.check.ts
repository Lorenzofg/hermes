// Self-check for monthWarnings — run with: node apps/api/src/shared/months.check.ts
import assert from 'node:assert/strict'
import { monthWarnings } from './months.ts'

const day = (date: string) => ({ date, shifts: [] })

// Jan, Feb, Apr, Jul read: Mar, May and Jun are missing
assert.deepEqual(monthWarnings([day('10/01/2025'), day('03/02/2025'), day('01/04/2025'), day('15/07/2025')], []), [
  'Mês faltante: 03/2025 — nenhum dia encontrado no documento',
  'Mês faltante: 05/2025 — nenhum dia encontrado no documento',
  'Mês faltante: 06/2025 — nenhum dia encontrado no documento',
])

// a leave covering the gap (printed on two pages) is reported once and hides the month
assert.deepEqual(
  monthWarnings([day('10/02/2025'), day('01/04/2025')], [
    { from: '01/03/2025', to: '31/03/2025', reason: 'Férias' },
    { from: '01/03/2025', to: '31/03/2025', reason: 'Férias' },
  ]),
  ['Férias/afastamento: 01/03/2025 a 31/03/2025 — Férias'],
)

// gap across the year boundary
assert.deepEqual(monthWarnings([day('05/11/2024'), day('05/02/2025')], []), [
  'Mês faltante: 12/2024 — nenhum dia encontrado no documento',
  'Mês faltante: 01/2025 — nenhum dia encontrado no documento',
])

// unparseable leave dates are ignored; no days means no gaps
assert.deepEqual(monthWarnings([], [{ from: '', to: '31/03/2025', reason: 'Férias' }]), [])

console.log('months.check: ok')
