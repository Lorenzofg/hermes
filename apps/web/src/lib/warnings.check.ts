// Self-check for groupWarnings — run with: node apps/web/src/lib/warnings.check.ts
import assert from 'node:assert/strict'
import { groupWarnings, missingMonths, withoutMissing } from './warnings.ts'

assert.deepEqual(
  groupWarnings([
    'Horário suspeito: 11/03/2025 — entrada às 03:00',
    'Ponto incompleto: 10/03/2025 — falta saída',
    '12/03/2025: texto sem categoria',
    'ponto incompleto: 13/03/2025 — falta entrada',
  ]),
  [
    { category: 'Ponto incompleto', items: ['10/03/2025 — falta saída', '13/03/2025 — falta entrada'] },
    { category: 'Horário suspeito', items: ['11/03/2025 — entrada às 03:00'] },
    { category: 'Outros', items: ['12/03/2025: texto sem categoria'] },
  ],
)
assert.deepEqual(groupWarnings([]), [])

const flagged = ['Mês faltante: 03/2025 — nenhum dia', 'Ponto incompleto: x', 'Mês faltante: 05/2025 — nenhum dia']
assert.deepEqual(missingMonths(flagged), ['03/2025', '05/2025'])
assert.deepEqual(withoutMissing(flagged, ['03/2025']), ['Ponto incompleto: x', 'Mês faltante: 05/2025 — nenhum dia'])

console.log('warnings.check: ok')
