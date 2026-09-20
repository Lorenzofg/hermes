import { db } from '../../db/index.js'
import { batchTimesheetAnalyses, batchTimesheetPeople, batchTimesheetRecords } from './schema.js'
import { eq, and } from 'drizzle-orm'
import { generateCsv } from '../timesheet/service.js'
import type { BatchPersonResult, DayEntry, PageLogEntry, AIProvider } from '@hermes/types'

interface SaveBatchParams {
  userId: number
  provider: AIProvider
  fileName: string
  people: BatchPersonResult[]
  pageLog: PageLogEntry[]
  inputTokens: number
  outputTokens: number
}

export async function saveBatchAnalysis(params: SaveBatchParams) {
  const { userId, provider, fileName, people, pageLog, inputTokens, outputTokens } = params

  const [analysis] = await db
    .insert(batchTimesheetAnalyses)
    .values({ userId, provider, fileName, totalPeople: people.length, pageLog, inputTokens, outputTokens })
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

export async function listBatchAnalyses(userId: number) {
  return db
    .select({
      id:          batchTimesheetAnalyses.id,
      createdAt:   batchTimesheetAnalyses.createdAt,
      provider:    batchTimesheetAnalyses.provider,
      fileName:    batchTimesheetAnalyses.fileName,
      totalPeople: batchTimesheetAnalyses.totalPeople,
    })
    .from(batchTimesheetAnalyses)
    .where(eq(batchTimesheetAnalyses.userId, userId))
    .orderBy(batchTimesheetAnalyses.createdAt)
}

export async function getBatchAnalysis(id: number, userId: number) {
  const [analysis] = await db
    .select()
    .from(batchTimesheetAnalyses)
    .where(and(eq(batchTimesheetAnalyses.id, id), eq(batchTimesheetAnalyses.userId, userId)))
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

// Overwrites one person's days within a batch — lets the user fix a wrong
// row or clear a value in History after the fact, not just during review.
export async function updateBatchPerson(personId: number, userId: number, days: DayEntry[]) {
  const [existing] = await db
    .select({ id: batchTimesheetPeople.id })
    .from(batchTimesheetPeople)
    .innerJoin(batchTimesheetAnalyses, eq(batchTimesheetAnalyses.id, batchTimesheetPeople.analysisId))
    .where(and(eq(batchTimesheetPeople.id, personId), eq(batchTimesheetAnalyses.userId, userId)))
  if (!existing) return null

  const csvContent = generateCsv(days)

  await db.delete(batchTimesheetRecords).where(eq(batchTimesheetRecords.personId, personId))
  if (days.length > 0) {
    await db.insert(batchTimesheetRecords).values(
      days.map((day) => {
        const s = [...day.shifts]
        while (s.length < 6) s.push({ clockIn: '', clockOut: '' })
        return {
          personId,
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

  await db.update(batchTimesheetPeople).set({ totalDays: days.length, csvContent }).where(eq(batchTimesheetPeople.id, personId))

  return { csvContent }
}

export async function getBatchPersonCsv(personId: number, userId: number) {
  const [person] = await db
    .select({
      id:          batchTimesheetPeople.id,
      personName:  batchTimesheetPeople.personName,
      csvContent:  batchTimesheetPeople.csvContent,
    })
    .from(batchTimesheetPeople)
    .innerJoin(batchTimesheetAnalyses, eq(batchTimesheetAnalyses.id, batchTimesheetPeople.analysisId))
    .where(and(eq(batchTimesheetPeople.id, personId), eq(batchTimesheetAnalyses.userId, userId)))
  return person ?? null
}
