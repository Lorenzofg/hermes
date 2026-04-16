import { db } from '../../db/index.js'
import { timesheetAnalyses, timesheetRecords } from './schema.js'
import { eq } from 'drizzle-orm'
import { stringify } from 'csv-stringify/sync'
import type { DayEntry, AnalyzeTimesheetResponse } from '@hermes/types'

// CSV headers use PJe-Calc column naming convention
const CSV_HEADERS = [
  'data',
  'entrada1', 'saida1',
  'entrada2', 'saida2',
  'entrada3', 'saida3',
  'entrada4', 'saida4',
  'entrada5', 'saida5',
  'entrada6', 'saida6',
]

export function generateCsv(days: DayEntry[]): string {
  const rows = days.map((day) => {
    const shifts = [...day.shifts]
    while (shifts.length < 6) shifts.push({ clockIn: '', clockOut: '' })

    return {
      data:     day.date,
      entrada1: shifts[0].clockIn,  saida1: shifts[0].clockOut,
      entrada2: shifts[1].clockIn,  saida2: shifts[1].clockOut,
      entrada3: shifts[2].clockIn,  saida3: shifts[2].clockOut,
      entrada4: shifts[3].clockIn,  saida4: shifts[3].clockOut,
      entrada5: shifts[4].clockIn,  saida5: shifts[4].clockOut,
      entrada6: shifts[5].clockIn,  saida6: shifts[5].clockOut,
    }
  })

  return stringify(rows, {
    header: true,
    columns: CSV_HEADERS,
    delimiter: ';',
    cast: { string: (value) => ({ value: value ?? '' }) },
  })
}

interface SaveParams {
  provider: 'claude' | 'gpt'
  fileName: string
  days: DayEntry[]
  warnings: string[]
  csvContent: string
}

export async function saveAnalysis(params: SaveParams) {
  const { provider, fileName, days, warnings, csvContent } = params

  const [record] = await db
    .insert(timesheetAnalyses)
    .values({ provider, fileName, totalDays: days.length, csvContent, warnings })
    .returning()

  if (days.length > 0) {
    await db.insert(timesheetRecords).values(
      days.map((day) => {
        const s = [...day.shifts]
        while (s.length < 6) s.push({ clockIn: '', clockOut: '' })
        return {
          analysisId: record.id,
          date:       day.date,
          clockIn1:  s[0].clockIn,  clockOut1: s[0].clockOut,
          clockIn2:  s[1].clockIn,  clockOut2: s[1].clockOut,
          clockIn3:  s[2].clockIn,  clockOut3: s[2].clockOut,
          clockIn4:  s[3].clockIn,  clockOut4: s[3].clockOut,
          clockIn5:  s[4].clockIn,  clockOut5: s[4].clockOut,
          clockIn6:  s[5].clockIn,  clockOut6: s[5].clockOut,
        }
      }),
    )
  }

  return record
}

export async function listAnalyses() {
  return db
    .select({
      id:        timesheetAnalyses.id,
      createdAt: timesheetAnalyses.createdAt,
      provider:  timesheetAnalyses.provider,
      fileName:  timesheetAnalyses.fileName,
      totalDays: timesheetAnalyses.totalDays,
    })
    .from(timesheetAnalyses)
    .orderBy(timesheetAnalyses.createdAt)
}

export async function getAnalysis(id: number): Promise<AnalyzeTimesheetResponse | null> {
  const [record] = await db.select().from(timesheetAnalyses).where(eq(timesheetAnalyses.id, id))
  if (!record) return null

  const rows = await db.select().from(timesheetRecords).where(eq(timesheetRecords.analysisId, id))

  return {
    csvContent: record.csvContent,
    totalDays:  record.totalDays,
    warnings:   record.warnings,
    days: rows.map((r) => ({
      date: r.date,
      shifts: [
        { clockIn: r.clockIn1, clockOut: r.clockOut1 },
        { clockIn: r.clockIn2, clockOut: r.clockOut2 },
        { clockIn: r.clockIn3, clockOut: r.clockOut3 },
        { clockIn: r.clockIn4, clockOut: r.clockOut4 },
        { clockIn: r.clockIn5, clockOut: r.clockOut5 },
        { clockIn: r.clockIn6, clockOut: r.clockOut6 },
      ].filter((s) => s.clockIn || s.clockOut),
    })),
  }
}
