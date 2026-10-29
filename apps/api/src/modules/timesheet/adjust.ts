import type { DayEntry, Shift } from '@hermes/types'

/** A shift the determination describes, with its intrajornada break, if any. */
export type CycleShift = Shift & { breakMinutes?: number }

/**
 * An override a judge determined over an already-scanned timesheet — the AI
 * only reads which override it is, the arithmetic below is deliberately not
 * left to the AI.
 */
export type Adjustment = (
  | { op: 'break'; from: string; to: string }
  | { op: 'breakMinutes'; minutes: number }
  | { op: 'setShifts'; shifts: CycleShift[] }
) & {
  weekdays?: number[] // 0 = domingo … 6 = sábado; omitted = every other day
  week?: number       // 1-based week inside the cycle; omitted = every week
}

/** Repeating roster (turno de revezamento) the determination may describe. */
export interface CycleOptions {
  startDate?: string  // dd/MM/yyyy — first day of week 1
  cycleWeeks?: number // length of the cycle in weeks, rest weeks included
}

function parseBRDate(s: string): Date {
  const [dd, mm, yyyy] = s.split('/').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

function dateKey(s: string): number {
  const [dd, mm, yyyy] = s.split('/').map(Number)
  return Date.UTC(yyyy, mm - 1, dd)
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function toHHmm(total: number): string {
  const n = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

// Duration of a shift, wrapping past midnight (23:00 → 07:00 = 8h).
function shiftMinutes(clockIn: string, clockOut: string): number {
  return ((toMinutes(clockOut) - toMinutes(clockIn) + 1440) % 1440)
}

/**
 * Splits a shift around its intrajornada break. The determination usually
 * gives only the break's length, not where it sits, so it goes in the middle.
 */
function expandShift(s: CycleShift): Shift[] {
  const { breakMinutes, clockIn, clockOut } = s
  if (!breakMinutes || breakMinutes <= 0 || !clockIn || !clockOut) return [{ clockIn, clockOut }]

  const worked = shiftMinutes(clockIn, clockOut)
  if (worked <= breakMinutes) return [{ clockIn, clockOut }]

  const resumes = toMinutes(clockIn) + Math.floor((worked - breakMinutes) / 2)
  return [
    { clockIn, clockOut: toHHmm(resumes) },
    { clockIn: toHHmm(resumes + breakMinutes), clockOut },
  ]
}

// ponytail: the break is the gap between the 1st and 2nd shift; days with
// more shifts keep the later ones untouched. Enough for intrajornada.
function adjustShifts(shifts: Shift[], adj: Adjustment): Shift[] {
  if (adj.op === 'setShifts') return adj.shifts.flatMap(expandShift)

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

// Which week of the repeating cycle a date falls on (1-based). The cycle runs
// from the anchor in whole 7-day blocks, so no calendar-week alignment needed.
function weekOfCycle(key: number, start: number, weeks: number): number {
  const cycle = weeks * 7
  const offset = ((Math.round((key - start) / 86_400_000) % cycle) + cycle) % cycle
  return Math.floor(offset / 7) + 1
}

/**
 * Applies the determination to the days already in the table. Each day gets
 * the adjustment for its weekday in its cycle week, else the one without
 * weekdays in that week. Days outside [dateFrom, dateTo] (both optional,
 * dd/MM/yyyy), with no matching adjustment, or with no registered shift are
 * returned untouched.
 */
export function applyAdjustment(
  days: DayEntry[],
  adjs: Adjustment[],
  dateFrom?: string,
  dateTo?: string,
  cycle?: CycleOptions,
): DayEntry[] {
  const from = dateFrom ? dateKey(dateFrom) : -Infinity
  const to   = dateTo   ? dateKey(dateTo)   : Infinity
  const start = cycle?.startDate ? dateKey(cycle.startDate) : null
  const cycleWeeks = cycle?.cycleWeeks && cycle.cycleWeeks > 0 ? cycle.cycleWeeks : 1

  return days.map((day) => {
    const key = dateKey(day.date)
    if (key < from || key > to) return day

    const date = parseBRDate(day.date)
    const week = start === null ? 1 : weekOfCycle(key, start, cycleWeeks)
    const inWeek = adjs.filter((a) => !a.week || a.week === week)
    const adj = inWeek.find((a) => a.weekdays?.includes(date.getDay())) ?? inWeek.find((a) => !a.weekdays?.length)
    if (!adj) return day

    const shifts = day.shifts.filter((s) => s.clockIn || s.clockOut)
    if (shifts.length === 0) return day

    return { date: day.date, shifts: adjustShifts(shifts, adj) }
  })
}
