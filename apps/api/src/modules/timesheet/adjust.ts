import type { DayEntry, Shift } from '@hermes/types'

/**
 * An override a judge determined over an already-scanned timesheet — the AI
 * only reads which override it is, the arithmetic below is deliberately not
 * left to the AI.
 */
export type Adjustment = (
  | { op: 'break'; from: string; to: string }
  | { op: 'breakMinutes'; minutes: number }
  | { op: 'setShifts'; shifts: Shift[] }
) & { weekdays?: number[] } // 0 = domingo … 6 = sábado; omitted = every other day

function parseBRDate(s: string): Date {
  const [dd, mm, yyyy] = s.split('/').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function toHHmm(total: number): string {
  const n = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

// ponytail: the break is the gap between the 1st and 2nd shift; days with
// more shifts keep the later ones untouched. Enough for intrajornada.
function adjustShifts(shifts: Shift[], adj: Adjustment): Shift[] {
  if (adj.op === 'setShifts') return adj.shifts.map((s) => ({ ...s }))

  if (adj.op === 'break') {
    // No break registered: split the single shift, but only if the determined
    // break actually falls inside it.
    if (shifts.length === 1) {
      const { clockIn, clockOut } = shifts[0]
      if (!clockIn || !clockOut) return shifts
      if (toMinutes(adj.from) <= toMinutes(clockIn) || toMinutes(adj.to) >= toMinutes(clockOut)) return shifts
      return [{ clockIn, clockOut: adj.from }, { clockIn: adj.to, clockOut }]
    }
    return shifts.map((s, i) =>
      i === 0 ? { ...s, clockOut: adj.from } : i === 1 ? { ...s, clockIn: adj.to } : { ...s },
    )
  }

  // breakMinutes: keep when the break started, move when it ends.
  if (shifts.length < 2 || !shifts[0].clockOut) return shifts
  const resumesAt = toHHmm(toMinutes(shifts[0].clockOut) + adj.minutes)
  return shifts.map((s, i) => (i === 1 ? { ...s, clockIn: resumesAt } : { ...s }))
}

/**
 * Applies the determination to the days already in the table. Each day gets
 * the adjustment listing its weekday, else the one without weekdays. Days
 * outside [dateFrom, dateTo] (both optional, dd/MM/yyyy), with no matching
 * adjustment, or with no registered shift are returned untouched.
 */
export function applyAdjustment(days: DayEntry[], adjs: Adjustment[], dateFrom?: string, dateTo?: string): DayEntry[] {
  const from = dateFrom ? parseBRDate(dateFrom).getTime() : -Infinity
  const to   = dateTo   ? parseBRDate(dateTo).getTime()   : Infinity

  return days.map((day) => {
    const date = parseBRDate(day.date)
    const time = date.getTime()
    if (time < from || time > to) return day

    const adj = adjs.find((a) => a.weekdays?.includes(date.getDay())) ?? adjs.find((a) => !a.weekdays?.length)
    if (!adj) return day

    const shifts = day.shifts.filter((s) => s.clockIn || s.clockOut)
    if (shifts.length === 0) return day

    return { date: day.date, shifts: adjustShifts(shifts, adj) }
  })
}
