// Self-check for addPeriodDays — run with: node apps/api/src/modules/timesheet/add-period.check.ts
import assert from 'node:assert/strict'
import { addPeriodDays } from './add-period.ts'

// "de 15/06/2021 a 30/09/2022, de segunda a sexta das 08:00 às 12:00 e das 14:00 às 19:30, e aos sábados das 08:00 às 19:00"
const week = [{ clockIn: '08:00', clockOut: '12:00' }, { clockIn: '14:00', clockOut: '19:30' }]
const sat = [{ clockIn: '08:00', clockOut: '19:00' }]
const schedules = [{ weekdays: [1, 2, 3, 4, 5], shifts: week }, { weekdays: [6], shifts: sat }]

// 15/06/2021 is a Tuesday, 30/09/2022 a Friday: 406 days without Sundays
const added = addPeriodDays([], '15/06/2021', '30/09/2022', schedules)
assert.equal(added.length, 406)
assert.deepEqual(added[0], { date: '15/06/2021', shifts: week })
assert.deepEqual(added.find((d) => d.date === '19/06/2021'), { date: '19/06/2021', shifts: sat })
assert.deepEqual(added.find((d) => d.date === '30/09/2022'), { date: '30/09/2022', shifts: week })
assert.ok(!added.some((d) => d.date === '20/06/2021')) // Sunday

// each day gets its own copy of the shifts
const [a, b] = [added.find((d) => d.date === '19/06/2021')!, added.find((d) => d.date === '26/06/2021')!]
assert.deepEqual(a.shifts, b.shifts)
assert.notEqual(a.shifts, b.shifts)

// days already punched inside the period are kept untouched, not duplicated
const existing = [{ date: '15/06/2021', shifts: [{ clockIn: '09:00', clockOut: '18:00' }] }]
const withExisting = addPeriodDays(existing, '15/06/2021', '30/09/2022', schedules)
assert.equal(withExisting.length, 406)
assert.deepEqual(withExisting.filter((d) => d.date === '15/06/2021'), existing)

// a blank day is filled; an unusable period leaves the table alone
assert.deepEqual(
  addPeriodDays([{ date: '15/06/2021', shifts: [{ clockIn: '', clockOut: '' }] }], '15/06/2021', '15/06/2021', schedules),
  [{ date: '15/06/2021', shifts: week }],
)
assert.deepEqual(addPeriodDays(existing, '30/09/2022', '15/06/2021', schedules), existing)
assert.deepEqual(addPeriodDays(existing, '', '', schedules), existing)

console.log('add-period.check: ok')
