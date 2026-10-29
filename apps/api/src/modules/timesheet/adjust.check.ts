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

// --- cycle: turno de revezamento (3 weeks of work + 10 rest days = 4 weeks)
const cycleStart = '03/03/2025' // a Monday
const punch = { clockIn: '08:00', clockOut: '18:00' }
const roster = [
  { week: 1, weekdays: [1, 2, 3, 4], op: 'setShifts' as const, shifts: [{ clockIn: '23:00', clockOut: '07:00', breakMinutes: 30 }] },
  { week: 1, weekdays: [5, 6, 0], op: 'setShifts' as const, shifts: [{ clockIn: '19:00', clockOut: '07:00', breakMinutes: 60 }] },
  { week: 2, weekdays: [1, 2, 3, 4], op: 'setShifts' as const, shifts: [{ clockIn: '15:00', clockOut: '23:00', breakMinutes: 60 }] },
  { week: 2, weekdays: [5, 6, 0], op: 'setShifts' as const, shifts: [{ clockIn: '07:00', clockOut: '19:00', breakMinutes: 60 }] },
  { week: 3, weekdays: [1, 2, 3, 4], op: 'setShifts' as const, shifts: [{ clockIn: '07:00', clockOut: '15:00', breakMinutes: 60 }] },
]
const cycleDays = ['03/03/2025', '07/03/2025', '10/03/2025', '21/03/2025', '24/03/2025', '31/03/2025']
  .map((date) => ({ date, shifts: [{ ...punch }] }))
const cycled = applyAdjustment(cycleDays, roster, undefined, undefined, { startDate: cycleStart, cycleWeeks: 4 })

// week 1, Monday: night shift, 30min break splits it in the middle
assert.deepEqual(cycled[0].shifts, [
  { clockIn: '23:00', clockOut: '02:45' },
  { clockIn: '03:15', clockOut: '07:00' },
])
// week 1, Friday: 19:00–07:00 with 1h break
assert.deepEqual(cycled[1].shifts, [
  { clockIn: '19:00', clockOut: '00:30' },
  { clockIn: '01:30', clockOut: '07:00' },
])
// week 2, Monday: 15:00–23:00 with 1h break
assert.deepEqual(cycled[2].shifts, [
  { clockIn: '15:00', clockOut: '18:30' },
  { clockIn: '19:30', clockOut: '23:00' },
])
// week 3, Friday: the 10 rest days start after Thursday — untouched
assert.deepEqual(cycled[3], cycleDays[3])
// week 4: all rest
assert.deepEqual(cycled[4], cycleDays[4])
// cycle restarts on 31/03 — week 1 again
assert.deepEqual(cycled[5].shifts, cycled[0].shifts)

// a week-specific adjustment never leaks into the other weeks
const onlyWeek2 = applyAdjustment(cycleDays, [roster[2]], undefined, undefined, { startDate: cycleStart, cycleWeeks: 4 })
assert.deepEqual(onlyWeek2[0], cycleDays[0])
assert.deepEqual(onlyWeek2[2].shifts, cycled[2].shifts)

console.log('adjust.check: ok')
