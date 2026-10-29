import type { DayEntry } from '@hermes/types'
import { dateKey, weekOfCycle, expandShifts, type CycleOptions, type CycleShift } from './adjust.js'

// One daily schedule the judge presumed, for the listed weekdays (0 = domingo … 6 = sábado).
// "week" pins it to a week of a repeating roster (turno de revezamento).
export interface PresumedSchedule {
  weekdays: number[]
  shifts: CycleShift[]
  week?: number
}

function formatBRDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function pickSchedule(schedules: PresumedSchedule[], date: Date, dateStr: string, cycle?: CycleOptions): PresumedSchedule | undefined {
  const weeks = cycle?.cycleWeeks ?? 1
  const start = cycle?.startDate ? dateKey(cycle.startDate) : null
  const week = start === null ? 1 : weekOfCycle(dateKey(dateStr), start, weeks)
  return schedules.find((s) => (!s.week || s.week === week) && s.weekdays.includes(date.getDay()))
}

/**
 * Fills the given months (MM/yyyy) — ones the defendant never attached — with
 * the presumed schedule, plain date arithmetic. Days with any punch are never
 * overwritten; blank days (a page attached with nothing on it) are replaced.
 */
export function fillMissingMonths(days: DayEntry[], months: string[], schedules: PresumedSchedule[], cycle?: CycleOptions): DayEntry[] {
  const hasPunch = (d: DayEntry) => d.shifts.some((s) => s.clockIn || s.clockOut)
  const present = new Set(days.filter(hasPunch).map((d) => d.date))
  const blankRestDays = !!cycle?.startDate && (cycle?.cycleWeeks ?? 1) > 1
  const added: DayEntry[] = []

  for (const month of months) {
    const [mm, yyyy] = month.split('/').map(Number)
    if (!mm || !yyyy) continue
    for (const d = new Date(yyyy, mm - 1, 1); d.getMonth() === mm - 1; d.setDate(d.getDate() + 1)) {
      const date = formatBRDate(d)
      const schedule = pickSchedule(schedules, d, date, cycle)
      if (present.has(date)) continue
      if (!schedule) {
        if (blankRestDays) added.push({ date, shifts: [] })
        continue
      }
      added.push({ date, shifts: expandShifts(schedule.shifts) })
    }
  }

  const replaced = new Set(added.map((d) => d.date))
  return [...days.filter((d) => !replaced.has(d.date)), ...added]
}
