import { db } from '../db/index.js'
import { timesheetAnalyses } from '../modules/timesheet/schema.js'
import { batchTimesheetAnalyses } from '../modules/timesheet-batch/schema.js'
import { payslipAnalyses, payslipRecords } from '../modules/payslip/schema.js'
import { eq, sql } from 'drizzle-orm'

export interface HistoryItem {
  id: number
  type: string
  createdAt: string
  provider: string
  fileName: string
  summary: string
  inputTokens: number
  outputTokens: number
  detailPath: string
}

export async function getHistory(userId: number): Promise<HistoryItem[]> {
  const timesheets = await db
    .select({
      id:           timesheetAnalyses.id,
      createdAt:    timesheetAnalyses.createdAt,
      provider:     timesheetAnalyses.provider,
      fileName:     timesheetAnalyses.fileName,
      totalDays:    timesheetAnalyses.totalDays,
      inputTokens:  timesheetAnalyses.inputTokens,
      outputTokens: timesheetAnalyses.outputTokens,
    })
    .from(timesheetAnalyses)
    .where(eq(timesheetAnalyses.userId, userId))
    .orderBy(timesheetAnalyses.createdAt)

  const items: HistoryItem[] = timesheets.map((r) => ({
    id:           r.id,
    type:         'timesheet',
    createdAt:    r.createdAt.toISOString(),
    provider:     r.provider,
    fileName:     r.fileName,
    summary:      `${r.totalDays} dia${r.totalDays !== 1 ? 's' : ''}`,
    inputTokens:  r.inputTokens,
    outputTokens: r.outputTokens,
    detailPath:   `/timesheet/${r.id}`,
  }))

  const payslips = await db
    .select({
      id:           payslipAnalyses.id,
      createdAt:    payslipAnalyses.createdAt,
      provider:     payslipAnalyses.provider,
      fileName:     payslipAnalyses.fileName,
      inputTokens:  payslipAnalyses.inputTokens,
      outputTokens: payslipAnalyses.outputTokens,
      count:        sql<number>`count(${payslipRecords.id})::int`,
    })
    .from(payslipAnalyses)
    .leftJoin(payslipRecords, eq(payslipRecords.analysisId, payslipAnalyses.id))
    .where(eq(payslipAnalyses.userId, userId))
    .groupBy(payslipAnalyses.id)

  for (const r of payslips) {
    items.push({
      id:           r.id,
      type:         'payslip',
      createdAt:    r.createdAt.toISOString(),
      provider:     r.provider,
      fileName:     r.fileName,
      summary:      `${r.count} holerite${r.count !== 1 ? 's' : ''}`,
      inputTokens:  r.inputTokens,
      outputTokens: r.outputTokens,
      detailPath:   `/payslip/${r.id}`,
    })
  }

  const batches = await db
    .select({
      id:           batchTimesheetAnalyses.id,
      createdAt:    batchTimesheetAnalyses.createdAt,
      provider:     batchTimesheetAnalyses.provider,
      fileName:     batchTimesheetAnalyses.fileName,
      totalPeople:  batchTimesheetAnalyses.totalPeople,
      inputTokens:  batchTimesheetAnalyses.inputTokens,
      outputTokens: batchTimesheetAnalyses.outputTokens,
    })
    .from(batchTimesheetAnalyses)
    .where(eq(batchTimesheetAnalyses.userId, userId))

  for (const r of batches) {
    items.push({
      id:           r.id,
      type:         'batch',
      createdAt:    r.createdAt.toISOString(),
      provider:     r.provider,
      fileName:     r.fileName,
      summary:      `${r.totalPeople} pessoa${r.totalPeople !== 1 ? 's' : ''}`,
      inputTokens:  r.inputTokens,
      outputTokens: r.outputTokens,
      detailPath:   `/timesheet-batch/${r.id}`,
    })
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
