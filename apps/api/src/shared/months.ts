import type { DayEntry } from '@hermes/types'

// A vacation/leave period the AI read off a page (dates dd/MM/yyyy).
export interface Leave {
  from: string
  to: string
  reason: string
}

function parseBRDate(s: string): Date | null {
  const [dd, mm, yyyy] = s.split('/').map(Number)
  if (!dd || !mm || !yyyy) return null
  return new Date(yyyy, mm - 1, dd)
}

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth()

const hasPunch = (d: DayEntry) => d.shifts.some((s) => s.clockIn || s.clockOut)

/**
 * Warnings computed in code over all pages at once — the AI sees a single
 * page, so it can't tell a month is missing. A month within the period read
 * with no punch at all — no page for it, or a page with every day blank —
 * is "Mês faltante", unless a leave the AI read covers it.
 * Prefixes match the categories in the web's lib/warnings.ts.
 */
export function monthWarnings(days: DayEntry[], leaves: Leave[]): string[] {
  const warnings: string[] = []

  const validLeaves = new Map<string, { from: Date; to: Date; leave: Leave }>()
  for (const leave of leaves) {
    const from = parseBRDate(leave.from)
    const to = parseBRDate(leave.to)
    if (!from || !to) continue
    // the same leave is often printed on several pages
    validLeaves.set(`${leave.from}|${leave.to}`, { from, to, leave })
  }
  for (const { leave } of validLeaves.values()) {
    warnings.push(`Férias/afastamento: ${leave.from} a ${leave.to} — ${leave.reason || 'sem motivo informado'}`)
  }

  const monthOf = (d: DayEntry) => { const date = parseBRDate(d.date); return date ? monthIndex(date) : null }
  const read = days.map(monthOf).filter((m): m is number => m !== null)
  if (read.length === 0) return warnings
  const punched = new Set(days.filter(hasPunch).map(monthOf))

  // the period runs over every month read, blank ones included, so a blank
  // first or last page still counts
  const first = Math.min(...read)
  const last = Math.max(...read)
  for (let m = first; m <= last; m++) {
    if (punched.has(m)) continue
    const covered = [...validLeaves.values()].some(({ from, to }) => monthIndex(from) <= m && monthIndex(to) >= m)
    if (covered) continue
    const label = `${String((m % 12) + 1).padStart(2, '0')}/${Math.floor(m / 12)}`
    warnings.push(`Mês faltante: ${label} — nenhum registro de ponto no documento`)
  }

  return warnings
}
