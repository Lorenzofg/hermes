import type { DayEntry } from '@hermes/types'

// Only the filled shifts matter — the table pads every day to 6 empty ones.
const punches = (d: DayEntry) => JSON.stringify(d.shifts.filter((s) => s.clockIn || s.clockOut))

// How many days in `after` are new or have different punches than in `before`.
export function countChangedDays(before: DayEntry[], after: DayEntry[]): number {
  const old = new Map(before.map((d) => [d.date, punches(d)]))
  return after.filter((d) => old.get(d.date) !== punches(d)).length
}

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/**
 * Splits the table rows into one page per calendar month, in row order (the
 * days are already sorted by date). A row without a full dd/MM/yyyy date —
 * e.g. one just added — stays on the page of the row before it.
 */
export function monthPages(dates: string[]): { start: number; end: number; label: string }[] {
  const pages: { start: number; end: number; key: string }[] = []
  dates.forEach((date, i) => {
    const key = /^\d{2}\/(\d{2}\/\d{4})$/.exec(date.trim())?.[1] ?? null
    const last = pages[pages.length - 1]
    if (last && (key === null || key === last.key)) last.end = i + 1
    else pages.push({ start: i, end: i + 1, key: key ?? '' })
  })
  return pages.map(({ start, end, key }) => {
    const [mm, yyyy] = key.split('/')
    const name = mm ? `${MONTH_NAMES[Number(mm) - 1] ?? mm}/${yyyy}` : 'Sem data'
    return { start, end, label: `${name} (${end - start} ${end - start === 1 ? 'dia' : 'dias'})` }
  })
}
