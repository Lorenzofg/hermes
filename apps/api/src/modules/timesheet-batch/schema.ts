import { pgTable, serial, text, integer, timestamp, bigint } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { providerEnum } from '../../db/enums.js'

export const batchTimesheetAnalyses = pgTable('batch_timesheet_analyses', {
  id:           serial('id').primaryKey(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  provider:     providerEnum('provider').notNull(),
  fileName:     text('file_name').notNull(),
  totalPeople:  integer('total_people').notNull(),
  inputTokens:  bigint('input_tokens', { mode: 'number' }).notNull().default(0),
  outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
})

export const batchTimesheetPeople = pgTable('batch_timesheet_people', {
  id:         serial('id').primaryKey(),
  analysisId: integer('analysis_id').notNull().references(() => batchTimesheetAnalyses.id, { onDelete: 'cascade' }),
  personName: text('person_name').notNull(),
  totalDays:  integer('total_days').notNull(),
  csvContent: text('csv_content').notNull(),
  warnings:   text('warnings').array().notNull().default(sql`'{}'`),
})

export const batchTimesheetRecords = pgTable('batch_timesheet_records', {
  id:        serial('id').primaryKey(),
  personId:  integer('person_id').notNull().references(() => batchTimesheetPeople.id, { onDelete: 'cascade' }),
  date:      text('date').notNull(),
  clockIn1:  text('clock_in_1').notNull().default(''),
  clockOut1: text('clock_out_1').notNull().default(''),
  clockIn2:  text('clock_in_2').notNull().default(''),
  clockOut2: text('clock_out_2').notNull().default(''),
  clockIn3:  text('clock_in_3').notNull().default(''),
  clockOut3: text('clock_out_3').notNull().default(''),
  clockIn4:  text('clock_in_4').notNull().default(''),
  clockOut4: text('clock_out_4').notNull().default(''),
  clockIn5:  text('clock_in_5').notNull().default(''),
  clockOut5: text('clock_out_5').notNull().default(''),
  clockIn6:  text('clock_in_6').notNull().default(''),
  clockOut6: text('clock_out_6').notNull().default(''),
})

export type BatchTimesheetAnalysis = typeof batchTimesheetAnalyses.$inferSelect
export type BatchTimesheetPerson   = typeof batchTimesheetPeople.$inferSelect
export type BatchTimesheetRecord   = typeof batchTimesheetRecords.$inferSelect
