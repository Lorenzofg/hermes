// Must match the categories the timesheet prompts tell the AI to prefix warnings
// with, plus the ones computed in code by the API (shared/months.ts, presume-missing).
export const WARNING_CATEGORIES = ['Mês faltante', 'Mês presumido', 'Férias/afastamento', 'Ponto incompleto', 'Horário suspeito', 'Correção manual', 'Ilegível'] as const

const OTHER = 'Outros'

// "Ponto incompleto: 10/03/2025 — falta saída" → grouped under "Ponto incompleto".
// Warnings with no known prefix (e.g. saved before categories existed) go to "Outros", last.
export function groupWarnings(warnings: string[]): { category: string; items: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const w of warnings) {
    const sep = w.indexOf(':')
    const prefix = sep > 0 ? w.slice(0, sep).trim() : ''
    const category = WARNING_CATEGORIES.find((c) => c.toLowerCase() === prefix.toLowerCase())
    const key = category ?? OTHER
    const text = category ? w.slice(sep + 1).trim() : w
    groups.set(key, [...(groups.get(key) ?? []), text])
  }
  return [...WARNING_CATEGORIES, OTHER]
    .filter((c) => groups.has(c))
    .map((category) => ({ category, items: groups.get(category)! }))
}

const MISSING = /^Mês faltante:\s*(\d{2}\/\d{4})/i

// The months flagged "Mês faltante: MM/yyyy — ..." by the API.
export function missingMonths(warnings: string[]): string[] {
  return warnings.map((w) => MISSING.exec(w)?.[1]).filter((m): m is string => !!m)
}

// Drops the "Mês faltante" warnings of months that have just been filled.
export function withoutMissing(warnings: string[], months: string[]): string[] {
  return warnings.filter((w) => !months.includes(MISSING.exec(w)?.[1] ?? ''))
}
