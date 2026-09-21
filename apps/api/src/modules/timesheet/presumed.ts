import type { DayEntry, Shift } from '@hermes/types'

const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

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
 * Expands a weekly work pattern (which weekdays are worked, and the shifts
 * on each of them) into one DayEntry per worked day across [dateFrom, dateTo]
 * — plain date arithmetic, deliberately not left to the AI.
 */
export function generatePresumedDays(workDays: string[], shifts: Shift[], dateFrom: string, dateTo: string): DayEntry[] {
  const workDaySet = new Set(workDays.map(normalize))
  const from = parseBRDate(dateFrom)
  const to = parseBRDate(dateTo)

  const days: DayEntry[] = []
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (workDaySet.has(normalize(WEEKDAY_NAMES[d.getDay()]))) {
      days.push({ date: formatBRDate(d), shifts: shifts.map((s) => ({ ...s })) })
    }
  }
  return days
}
