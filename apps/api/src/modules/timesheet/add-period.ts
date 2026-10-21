import type { DayEntry } from '@hermes/types'
import type { PresumedSchedule } from './presume-missing.js'

function parseBRDate(s: string): Date | null {
  const [dd, mm, yyyy] = s.split('/').map(Number)
  if (!dd || !mm || !yyyy) return null
  return new Date(yyyy, mm - 1, dd)
}

function formatBRDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Adds every day of [dateFrom, dateTo] that the presumed schedules cover and
 * the table doesn't already punch — days already recorded are kept as they
 * are, the period is only completed.
 */
export function addPeriodDays(days: DayEntry[], dateFrom: string, dateTo: string, schedules: PresumedSchedule[]): DayEntry[] {
  const from = parseBRDate(dateFrom)
  const to = parseBRDate(dateTo)
  if (!from || !to || from > to) return days

  const hasPunch = (d: DayEntry) => d.shifts.some((s) => s.clockIn || s.clockOut)
  const present = new Set(days.filter(hasPunch).map((d) => d.date))
  const added: DayEntry[] = []

  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const date = formatBRDate(d)
    const schedule = schedules.find((s) => s.weekdays.includes(d.getDay()))
    if (!schedule || present.has(date)) continue
    added.push({ date, shifts: schedule.shifts.map((s) => ({ ...s })) })
  }

  const replaced = new Set(added.map((d) => d.date))
  return [...days.filter((d) => !replaced.has(d.date)), ...added]
}
