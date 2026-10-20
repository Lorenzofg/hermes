// Self-check for countChangedDays — run with: node apps/web/src/lib/days.check.ts
import assert from 'node:assert/strict'
import { countChangedDays } from './days.ts'

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

console.log('days.check: ok')
