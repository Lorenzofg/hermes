// Self-check for applyAdjustment — run with: node apps/api/src/modules/timesheet/adjust.check.ts
import assert from 'node:assert/strict'
import { applyAdjustment } from './adjust.ts'

const pad = { clockIn: '', clockOut: '' }
const days = [
  { date: '10/03/2025', shifts: [{ clockIn: '08:00', clockOut: '12:00' }, { clockIn: '14:00', clockOut: '18:00' }, pad] },
  { date: '11/03/2025', shifts: [{ clockIn: '08:00', clockOut: '18:00' }] },
  { date: '12/03/2025', shifts: [pad] },
]

// break: the judge's 12:00–13:00 replaces the registered 12:00–14:00
assert.deepEqual(applyAdjustment(days, [{ op: 'break', from: '12:00', to: '13:00' }])[0].shifts, [
  { clockIn: '08:00', clockOut: '12:00' },
  { clockIn: '13:00', clockOut: '18:00' },
])

// break on a day with no break registered: splits the single shift
assert.deepEqual(applyAdjustment(days, [{ op: 'break', from: '12:00', to: '13:00' }])[1].shifts, [
  { clockIn: '08:00', clockOut: '12:00' },
  { clockIn: '13:00', clockOut: '18:00' },
])

// breakMinutes: 2h break becomes 1h, start kept
assert.deepEqual(applyAdjustment(days, [{ op: 'breakMinutes', minutes: 60 }])[0].shifts, [
  { clockIn: '08:00', clockOut: '12:00' },
  { clockIn: '13:00', clockOut: '18:00' },
])

// breakMinutes with no break registered: day untouched
assert.deepEqual(applyAdjustment(days, [{ op: 'breakMinutes', minutes: 60 }])[1].shifts, [{ clockIn: '08:00', clockOut: '18:00' }])

// empty day is never touched
assert.deepEqual(applyAdjustment(days, [{ op: 'break', from: '12:00', to: '13:00' }])[2], days[2])

// date range limits the adjustment
const ranged = applyAdjustment(days, [{ op: 'break', from: '12:00', to: '13:00' }], '11/03/2025', '11/03/2025')
assert.deepEqual(ranged[0], days[0])
assert.equal(ranged[1].shifts.length, 2)

// setShifts replaces the whole day
assert.deepEqual(applyAdjustment(days, [{ op: 'setShifts', shifts: [{ clockIn: '09:00', clockOut: '17:00' }] }])[0].shifts, [
  { clockIn: '09:00', clockOut: '17:00' },
])

// weekdays: 10/03/2025 is a Monday (12:00–12:30), 11/03/2025 a Tuesday (falls back to 12:00–13:00)
const byWeekday = applyAdjustment(days, [
  { weekdays: [1, 3], op: 'break', from: '12:00', to: '12:30' },
  { op: 'break', from: '12:00', to: '13:00' },
])
assert.equal(byWeekday[0].shifts[1].clockIn, '12:30')
assert.equal(byWeekday[1].shifts[1].clockIn, '13:00')

// no fallback: days of other weekdays are left untouched
assert.deepEqual(applyAdjustment(days, [{ weekdays: [3], op: 'break', from: '12:00', to: '12:30' }])[0], days[0])

console.log('adjust.check: ok')
