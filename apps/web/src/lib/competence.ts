import type { Payslip } from '@hermes/types'

// competence is "MM/yyyy" — sort chronologically, unparseable ones last
function competenceKey(c: string): number {
  const [mm, yyyy] = c.split('/')
  const key = Number(yyyy) * 100 + Number(mm)
  return Number.isFinite(key) && key > 0 ? key : Infinity
}

export function sortByCompetence(payslips: Payslip[]): Payslip[] {
  return [...payslips].sort((a, b) => competenceKey(a.competence) - competenceKey(b.competence))
}
