import type { DayEntry } from '@hermes/types'
import type { PresumedSchedule } from './presume-missing.js'
import { dateKey, weekOfCycle, expandShifts, type CycleOptions } from './adjust.js'

function parseBRDate(s: string): Date {
  const [dd, mm, yyyy] = s.split('/').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

function formatBRDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

/**
 * Expands a weekly work pattern (which weekdays are worked, and the shifts on
 * each of them) into one DayEntry per worked day across [dateFrom, dateTo] —
 * plain date arithmetic, deliberately not left to the AI. With a cycle, each
 * date uses the schedule of its week (turno de revezamento).
 */
export function generatePresumedDays(
  schedules: PresumedSchedule[],
  dateFrom: string,
  dateTo: string,
  cycle?: CycleOptions,
): DayEntry[] {
  const from = parseBRDate(dateFrom)
  const to = parseBRDate(dateTo)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return []

  const weeks = cycle?.cycleWeeks ?? 1
  const start = cycle?.startDate ? dateKey(cycle.startDate) : null
  // In a roster, a date with no schedule inside the cycle is a rest day the
  // determination imposed — it goes to the table as a blank row. A plain
  // weekly pattern keeps only the worked days (weekends are just not listed).
  const blankRestDays = start !== null && weeks > 1
  const days: DayEntry[] = []

  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const date = formatBRDate(d)
    const week = start === null ? 1 : weekOfCycle(dateKey(date), start, weeks)
    const schedule = schedules.find((s) => (!s.week || s.week === week) && s.weekdays.includes(d.getDay()))
    if (!schedule) {
      if (blankRestDays) days.push({ date, shifts: [] })
      continue
    }
    days.push({ date, shifts: expandShifts(schedule.shifts) })
  }

  return days
}
