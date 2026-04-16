import { db } from '../db/index.js'
import { timesheetAnalyses } from '../modules/timesheet/schema.js'

export interface HistoryItem {
  id: number
  type: string
  createdAt: string
  provider: string
  fileName: string
  summary: string // each module decides what to show (e.g. "31 days", "R$ 4.200,00")
  detailPath: string
}

export async function getHistory(): Promise<HistoryItem[]> {
  const timesheets = await db
    .select({
      id:        timesheetAnalyses.id,
      createdAt: timesheetAnalyses.createdAt,
      provider:  timesheetAnalyses.provider,
      fileName:  timesheetAnalyses.fileName,
      totalDays: timesheetAnalyses.totalDays,
    })
    .from(timesheetAnalyses)
    .orderBy(timesheetAnalyses.createdAt)

  const items: HistoryItem[] = timesheets.map((r) => ({
    id:          r.id,
    type:        'timesheet',
    createdAt:   r.createdAt.toISOString(),
    provider:    r.provider,
    fileName:    r.fileName,
    summary:     `${r.totalDays} days`,
    detailPath:  `/timesheet/${r.id}`,
  }))

  // future: push payslip items here

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
