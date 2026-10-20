// Self-check for countChangedDays — run with: node apps/web/src/lib/days.check.ts
import assert from 'node:assert/strict'
import { countChangedDays, monthPages } from './days.ts'

const empty = { clockIn: '', clockOut: '' }
const before = [
  { date: '01/03/2025', shifts: [{ clockIn: '08:00', clockOut: '12:00' }, { clockIn: '14:00', clockOut: '18:00' }, empty] },
  { date: '02/03/2025', shifts: [{ clockIn: '08:00', clockOut: '17:00' }, empty] },
]
const after = [
  { date: '01/03/2025', shifts: [{ clockIn: '08:00', clockOut: '12:00' }, { clockIn: '13:00', clockOut: '18:00' }] }, // changed
  { date: '02/03/2025', shifts: [{ clockIn: '08:00', clockOut: '17:00' }] }, // same punches, less padding
  { date: '03/03/2025', shifts: [{ clockIn: '08:00', clockOut: '17:00' }] }, // new
]
assert.equal(countChangedDays(before, after), 2)
assert.equal(countChangedDays(before, before), 0)

// one page per calendar month, whatever its length; a dateless new row joins the last page
assert.deepEqual(monthPages(['30/01/2025', '31/01/2025', '01/02/2025', '28/02/2025', '', '01/03/2025']), [
  { start: 0, end: 2, label: 'janeiro/2025 (2 dias)' },
  { start: 2, end: 5, label: 'fevereiro/2025 (3 dias)' },
  { start: 5, end: 6, label: 'março/2025 (1 dia)' },
])
assert.deepEqual(monthPages(['']), [{ start: 0, end: 1, label: 'Sem data (1 dia)' }])
assert.deepEqual(monthPages([]), [])

console.log('days.check: ok')
