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

/**
 * Warnings computed in code over all pages at once — the AI sees a single
 * page, so it can't tell a month is missing. A month between the first and
 * last one read with no day at all is "Mês faltante", unless a leave the AI
 * read covers it. Prefixes match the categories in the web's lib/warnings.ts.
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

  const months = new Set(days.map((d) => parseBRDate(d.date)).filter((d): d is Date => !!d).map(monthIndex))
  if (months.size === 0) return warnings

  const first = Math.min(...months)
  const last = Math.max(...months)
  for (let m = first + 1; m < last; m++) {
    if (months.has(m)) continue
    const covered = [...validLeaves.values()].some(({ from, to }) => monthIndex(from) <= m && monthIndex(to) >= m)
    if (covered) continue
    const label = `${String((m % 12) + 1).padStart(2, '0')}/${Math.floor(m / 12)}`
    warnings.push(`Mês faltante: ${label} — nenhum dia encontrado no documento`)
  }

  return warnings
}
