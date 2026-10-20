import type { DayEntry, Shift } from '@hermes/types'

// One daily schedule the judge presumed, for the listed weekdays (0 = domingo … 6 = sábado).
export interface PresumedSchedule {
  weekdays: number[]
  shifts: Shift[]
}

function formatBRDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Fills the given months (MM/yyyy) — ones the defendant never attached — with
 * the presumed schedule, plain date arithmetic. Days with any punch are never
 * overwritten; blank days (a page attached with nothing on it) are replaced.
 */
export function fillMissingMonths(days: DayEntry[], months: string[], schedules: PresumedSchedule[]): DayEntry[] {
  const hasPunch = (d: DayEntry) => d.shifts.some((s) => s.clockIn || s.clockOut)
  const present = new Set(days.filter(hasPunch).map((d) => d.date))
  const added: DayEntry[] = []

  for (const month of months) {
    const [mm, yyyy] = month.split('/').map(Number)
    if (!mm || !yyyy) continue
    for (const d = new Date(yyyy, mm - 1, 1); d.getMonth() === mm - 1; d.setDate(d.getDate() + 1)) {
      const date = formatBRDate(d)
      const schedule = schedules.find((s) => s.weekdays.includes(d.getDay()))
      if (!schedule || present.has(date)) continue
      added.push({ date, shifts: schedule.shifts.map((s) => ({ ...s })) })
    }
  }

  const replaced = new Set(added.map((d) => d.date))
  return [...days.filter((d) => !replaced.has(d.date)), ...added]
}
