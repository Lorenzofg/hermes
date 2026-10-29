import { db } from '../../db/index.js'
import { timesheetAnalyses, timesheetRecords, timesheetAnalysisVersions } from './schema.js'
import { eq, and, desc, sql } from 'drizzle-orm'
import { stringify } from 'csv-stringify/sync'
import type { DayEntry, AnalyzeTimesheetResponse, PageLogEntry, AIProvider } from '@hermes/types'

// CSV headers must match PJe-Calc's expected import format exactly
// (capitalized, with the accent on "Saída") — see ExemploJornadaCartaoDePonto.csv
const CSV_COLUMNS = [
  { key: 'data',     header: 'Data' },
  { key: 'entrada1', header: 'Entrada1' }, { key: 'saida1', header: 'Saída1' },
  { key: 'entrada2', header: 'Entrada2' }, { key: 'saida2', header: 'Saída2' },
  { key: 'entrada3', header: 'Entrada3' }, { key: 'saida3', header: 'Saída3' },
  { key: 'entrada4', header: 'Entrada4' }, { key: 'saida4', header: 'Saída4' },
  { key: 'entrada5', header: 'Entrada5' }, { key: 'saida5', header: 'Saída5' },
  { key: 'entrada6', header: 'Entrada6' }, { key: 'saida6', header: 'Saída6' },
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
    columns: CSV_COLUMNS,
    delimiter: ';',
    cast: { string: (value) => ({ value: value ?? '' }) },
  })
}

interface SaveParams {
  userId: number
  provider: AIProvider
  fileName: string
  days: DayEntry[]
  warnings: string[]
  pageLog: PageLogEntry[]
  csvContent: string
  inputTokens: number
  outputTokens: number
}

// Where a version came from — shown in History so the user knows what changed
// the table, and used by the chat/restore flows later.
export type VersionSource = 'scan' | 'manual' | 'restore' | 'adjust' | 'presume' | 'add-period' | 'chat'

// Every mutation writes a full snapshot; restoring a version is just another
// mutation, so no history is ever lost.
async function saveVersion(
  analysisId: number,
  days: DayEntry[],
  warnings: string[],
  csvContent: string,
  source: VersionSource,
) {
  const [row] = await db
    .select({ latest: sql<number>`coalesce(max(${timesheetAnalysisVersions.version}), 0)` })
    .from(timesheetAnalysisVersions)
    .where(eq(timesheetAnalysisVersions.analysisId, analysisId))

  await db.insert(timesheetAnalysisVersions).values({
    analysisId,
    version: Number(row?.latest ?? 0) + 1,
    source,
    days,
    warnings,
    csvContent,
  })
}

function dayToRecord(analysisId: number, day: DayEntry) {
  const s = [...day.shifts]
  while (s.length < 6) s.push({ clockIn: '', clockOut: '' })
  return {
    analysisId,
    date:      day.date,
    clockIn1:  s[0].clockIn,  clockOut1: s[0].clockOut,
    clockIn2:  s[1].clockIn,  clockOut2: s[1].clockOut,
    clockIn3:  s[2].clockIn,  clockOut3: s[2].clockOut,
    clockIn4:  s[3].clockIn,  clockOut4: s[3].clockOut,
    clockIn5:  s[4].clockIn,  clockOut5: s[4].clockOut,
    clockIn6:  s[5].clockIn,  clockOut6: s[5].clockOut,
  }
}

export async function saveAnalysis(params: SaveParams) {
  const { userId, provider, fileName, days, warnings, pageLog, csvContent, inputTokens, outputTokens } = params

  const [record] = await db
    .insert(timesheetAnalyses)
    .values({ userId, provider, fileName, totalDays: days.length, csvContent, warnings, pageLog, inputTokens, outputTokens })
    .returning()

  if (days.length > 0) {
    await db.insert(timesheetRecords).values(days.map((day) => dayToRecord(record.id, day)))
  }

  await saveVersion(record.id, days, warnings, csvContent, 'scan')

  return record
}

// Overwrites a saved analysis's days — lets the user fix a wrong row or
// clear a value in History after the fact, not just during the initial review.
// Warnings are replaced only when given (adjusting/presuming changes them).
export async function updateAnalysis(
  id: number,
  userId: number,
  days: DayEntry[],
  warnings?: string[],
  source: VersionSource = 'manual',
) {
  const [existing] = await db
    .select({ id: timesheetAnalyses.id, warnings: timesheetAnalyses.warnings })
    .from(timesheetAnalyses)
    .where(and(eq(timesheetAnalyses.id, id), eq(timesheetAnalyses.userId, userId)))
  if (!existing) return null

  const csvContent = generateCsv(days)
  const nextWarnings = warnings ?? existing.warnings

  await saveVersion(id, days, nextWarnings, csvContent, source)

  await db.delete(timesheetRecords).where(eq(timesheetRecords.analysisId, id))
  if (days.length > 0) {
    await db.insert(timesheetRecords).values(days.map((day) => dayToRecord(id, day)))
  }

  await db
    .update(timesheetAnalyses)
    .set({ totalDays: days.length, csvContent, warnings: nextWarnings })
    .where(eq(timesheetAnalyses.id, id))

  return { csvContent }
}

export interface AnalysisVersionSummary {
  version: number
  source: string
  totalDays: number
  createdAt: string
}

export async function listVersions(id: number, userId: number): Promise<AnalysisVersionSummary[] | null> {
  const [existing] = await db
    .select({ id: timesheetAnalyses.id })
    .from(timesheetAnalyses)
    .where(and(eq(timesheetAnalyses.id, id), eq(timesheetAnalyses.userId, userId)))
  if (!existing) return null

  const rows = await db
    .select({
      version:   timesheetAnalysisVersions.version,
      source:    timesheetAnalysisVersions.source,
      totalDays: sql<number>`jsonb_array_length(${timesheetAnalysisVersions.days})`,
      createdAt: timesheetAnalysisVersions.createdAt,
    })
    .from(timesheetAnalysisVersions)
    .where(eq(timesheetAnalysisVersions.analysisId, id))
    .orderBy(desc(timesheetAnalysisVersions.version))

  return rows.map((r) => ({
    version:   r.version,
    source:    r.source,
    totalDays: Number(r.totalDays),
    createdAt: r.createdAt.toISOString(),
  }))
}

// Reads an old snapshot without touching the analysis — the chat loads a
// version into the table and only "Salvar alterações" persists it.
export async function getVersionSnapshot(id: number, version: number, userId: number) {
  const [existing] = await db
    .select({ id: timesheetAnalyses.id })
    .from(timesheetAnalyses)
    .where(and(eq(timesheetAnalyses.id, id), eq(timesheetAnalyses.userId, userId)))
  if (!existing) return null

  const [snapshot] = await db
    .select({ days: timesheetAnalysisVersions.days, warnings: timesheetAnalysisVersions.warnings })
    .from(timesheetAnalysisVersions)
    .where(and(eq(timesheetAnalysisVersions.analysisId, id), eq(timesheetAnalysisVersions.version, version)))
  if (!snapshot) return null

  return { days: snapshot.days, warnings: snapshot.warnings }
}

export async function restoreVersion(id: number, version: number, userId: number) {
  const [existing] = await db
    .select({ id: timesheetAnalyses.id })
    .from(timesheetAnalyses)
    .where(and(eq(timesheetAnalyses.id, id), eq(timesheetAnalyses.userId, userId)))
  if (!existing) return null

  const [snapshot] = await db
    .select()
    .from(timesheetAnalysisVersions)
    .where(and(eq(timesheetAnalysisVersions.analysisId, id), eq(timesheetAnalysisVersions.version, version)))
  if (!snapshot) return null

  const restored = await updateAnalysis(id, userId, snapshot.days, snapshot.warnings, 'restore')
  if (!restored) return null

  return { ...restored, days: snapshot.days, warnings: snapshot.warnings }
}

export async function listAnalyses(userId: number) {
  return db
    .select({
      id:        timesheetAnalyses.id,
      createdAt: timesheetAnalyses.createdAt,
      provider:  timesheetAnalyses.provider,
      fileName:  timesheetAnalyses.fileName,
      totalDays: timesheetAnalyses.totalDays,
    })
    .from(timesheetAnalyses)
    .where(eq(timesheetAnalyses.userId, userId))
    .orderBy(timesheetAnalyses.createdAt)
}

export async function getAnalysis(id: number, userId: number): Promise<AnalyzeTimesheetResponse | null> {
  const [record] = await db
    .select()
    .from(timesheetAnalyses)
    .where(and(eq(timesheetAnalyses.id, id), eq(timesheetAnalyses.userId, userId)))
  if (!record) return null

  const rows = await db.select().from(timesheetRecords).where(eq(timesheetRecords.analysisId, id))

  return {
    csvContent: record.csvContent,
    totalDays:  record.totalDays,
    warnings:   record.warnings,
    pageLog:    record.pageLog,
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
