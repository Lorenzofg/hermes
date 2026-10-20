import type { DayEntry } from '@hermes/types'

// Only the filled shifts matter — the table pads every day to 6 empty ones.
const punches = (d: DayEntry) => JSON.stringify(d.shifts.filter((s) => s.clockIn || s.clockOut))

// How many days in `after` are new or have different punches than in `before`.
export function countChangedDays(before: DayEntry[], after: DayEntry[]): number {
  const old = new Map(before.map((d) => [d.date, punches(d)]))
  return after.filter((d) => old.get(d.date) !== punches(d)).length
}
