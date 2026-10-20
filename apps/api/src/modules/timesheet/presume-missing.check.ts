// Self-check for fillMissingMonths — run with: node apps/api/src/modules/timesheet/presume-missing.check.ts
import assert from 'node:assert/strict'
import { fillMissingMonths } from './presume-missing.ts'

const week = [{ clockIn: '08:00', clockOut: '12:00' }, { clockIn: '13:00', clockOut: '18:00' }]
const sat = [{ clockIn: '08:00', clockOut: '12:00' }]
const schedules = [{ weekdays: [1, 2, 3, 4, 5], shifts: week }, { weekdays: [6], shifts: sat }]

// March 2025: 21 weekdays + 5 Saturdays, no Sundays
const march = fillMissingMonths([], ['03/2025'], schedules)
assert.equal(march.length, 26)
assert.deepEqual(march[0], { date: '01/03/2025', shifts: sat }) // 01/03/2025 is a Saturday
assert.deepEqual(march[1], { date: '03/03/2025', shifts: week })
assert.ok(!march.some((d) => d.date === '02/03/2025')) // Sunday

// existing days are kept untouched, not duplicated
const existing = [{ date: '03/03/2025', shifts: [{ clockIn: '09:00', clockOut: '17:00' }] }]
const filled = fillMissingMonths(existing, ['03/2025'], schedules)
assert.equal(filled.length, 26)
assert.deepEqual(filled.filter((d) => d.date === '03/03/2025'), existing)

// February in a leap year, invalid month ignored
assert.equal(fillMissingMonths([], ['02/2024', 'xx'], [{ weekdays: [0, 1, 2, 3, 4, 5, 6], shifts: sat }]).length, 29)

// blank days (empty page) are replaced, not duplicated
const blankMonth = fillMissingMonths([{ date: '03/03/2025', shifts: [{ clockIn: '', clockOut: '' }] }], ['03/2025'], schedules)
assert.equal(blankMonth.length, 26)
assert.deepEqual(blankMonth.find((d) => d.date === '03/03/2025'), { date: '03/03/2025', shifts: week })

console.log('presume-missing.check: ok')
