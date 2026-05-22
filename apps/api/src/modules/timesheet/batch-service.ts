import { db } from '../../db/index.js'
import { batchTimesheetAnalyses, batchTimesheetPeople, batchTimesheetRecords } from './schema.js'
import { eq } from 'drizzle-orm'
import { generateCsv } from './service.js'
import type { BatchPersonResult } from '@hermes/types'

interface SaveBatchParams {
  provider: 'claude' | 'gpt'
  fileName: string
  people: BatchPersonResult[]
  inputTokens: number
  outputTokens: number
}

export async function saveBatchAnalysis(params: SaveBatchParams) {
  const { provider, fileName, people, inputTokens, outputTokens } = params

  const [analysis] = await db
    .insert(batchTimesheetAnalyses)
    .values({ provider, fileName, totalPeople: people.length, inputTokens, outputTokens })
    .returning()

  for (const person of people) {
    const csvContent = generateCsv(person.days)

    const [personRecord] = await db
      .insert(batchTimesheetPeople)
      .values({ analysisId: analysis.id, personName: person.name, totalDays: person.days.length, csvContent, warnings: person.warnings })
      .returning()

    if (person.days.length > 0) {
      await db.insert(batchTimesheetRecords).values(
        person.days.map((day) => {
          const s = [...day.shifts]
          while (s.length < 6) s.push({ clockIn: '', clockOut: '' })
          return {
            personId:  personRecord.id,
            date:      day.date,
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
  }

  return analysis
}

export async function listBatchAnalyses() {
  return db
    .select({
      id:          batchTimesheetAnalyses.id,
      createdAt:   batchTimesheetAnalyses.createdAt,
      provider:    batchTimesheetAnalyses.provider,
      fileName:    batchTimesheetAnalyses.fileName,
      totalPeople: batchTimesheetAnalyses.totalPeople,
    })
    .from(batchTimesheetAnalyses)
    .orderBy(batchTimesheetAnalyses.createdAt)
}

export async function getBatchAnalysis(id: number) {
  const [analysis] = await db.select().from(batchTimesheetAnalyses).where(eq(batchTimesheetAnalyses.id, id))
  if (!analysis) return null

  const people = await db.select().from(batchTimesheetPeople).where(eq(batchTimesheetPeople.analysisId, id))

  const peopleWithDays = await Promise.all(
    people.map(async (person) => {
      const rows = await db.select().from(batchTimesheetRecords).where(eq(batchTimesheetRecords.personId, person.id))
      const days = rows.map((r) => ({
        date: r.date,
        shifts: [
          { clockIn: r.clockIn1, clockOut: r.clockOut1 },
          { clockIn: r.clockIn2, clockOut: r.clockOut2 },
          { clockIn: r.clockIn3, clockOut: r.clockOut3 },
          { clockIn: r.clockIn4, clockOut: r.clockOut4 },
          { clockIn: r.clockIn5, clockOut: r.clockOut5 },
          { clockIn: r.clockIn6, clockOut: r.clockOut6 },
        ].filter((s) => s.clockIn || s.clockOut),
      }))
      return { ...person, days }
    }),
  )

  return { ...analysis, people: peopleWithDays }
}

export async function getBatchPersonCsv(personId: number) {
  const [person] = await db.select().from(batchTimesheetPeople).where(eq(batchTimesheetPeople.id, personId))
  return person ?? null
}
