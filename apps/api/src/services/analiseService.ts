import { db } from '../db/index.js'
import { analises, diasPonto } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { DayEntry, AnalyzeTimesheetResponse } from '@cris/types'

interface SaveAnalysisParams {
  provider: 'claude' | 'gpt'
  fileName: string
  days: DayEntry[]
  warnings: string[]
  csvContent: string
}

export async function saveAnalysis(params: SaveAnalysisParams) {
  const { provider, fileName, days, warnings, csvContent } = params

  const [record] = await db
    .insert(analises)
    .values({
      provider,
      nomeArquivo: fileName,
      totalDias: days.length,
      csvContent,
      avisos: warnings,
    })
    .returning()

  if (days.length > 0) {
    await db.insert(diasPonto).values(
      days.map((day) => {
        const s = [...day.shifts]
        while (s.length < 6) s.push({ clockIn: '', clockOut: '' })
        return {
          analiseId: record.id,
          data: day.date,
          entrada1: s[0].clockIn,  saida1: s[0].clockOut,
          entrada2: s[1].clockIn,  saida2: s[1].clockOut,
          entrada3: s[2].clockIn,  saida3: s[2].clockOut,
          entrada4: s[3].clockIn,  saida4: s[3].clockOut,
          entrada5: s[4].clockIn,  saida5: s[4].clockOut,
          entrada6: s[5].clockIn,  saida6: s[5].clockOut,
        }
      }),
    )
  }

  return record
}

export async function listAnalyses() {
  return db
    .select({
      id:        analises.id,
      createdAt: analises.createdAt,
      provider:  analises.provider,
      fileName:  analises.nomeArquivo,
      totalDays: analises.totalDias,
    })
    .from(analises)
    .orderBy(analises.createdAt)
}

export async function getAnalysis(id: number): Promise<AnalyzeTimesheetResponse | null> {
  const [record] = await db.select().from(analises).where(eq(analises.id, id))
  if (!record) return null

  const rows = await db.select().from(diasPonto).where(eq(diasPonto.analiseId, id))

  return {
    csvContent: record.csvContent,
    totalDays: record.totalDias,
    warnings: record.avisos,
    days: rows.map((r) => ({
      date: r.data,
      shifts: [
        { clockIn: r.entrada1, clockOut: r.saida1 },
        { clockIn: r.entrada2, clockOut: r.saida2 },
        { clockIn: r.entrada3, clockOut: r.saida3 },
        { clockIn: r.entrada4, clockOut: r.saida4 },
        { clockIn: r.entrada5, clockOut: r.saida5 },
        { clockIn: r.entrada6, clockOut: r.saida6 },
      ].filter((s) => s.clockIn || s.clockOut),
    })),
  }
}
