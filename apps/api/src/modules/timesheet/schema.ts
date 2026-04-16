import { pgTable, serial, text, integer, timestamp, bigint } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { providerEnum } from '../../db/enums.js'

export const timesheetAnalyses = pgTable('timesheet_analyses', {
  id:         serial('id').primaryKey(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  provider:   providerEnum('provider').notNull(),
  fileName:   text('file_name').notNull(),
  totalDays:  integer('total_days').notNull(),
  csvContent: text('csv_content').notNull(),
  warnings:      text('warnings').array().notNull().default(sql`'{}'`),
  inputTokens:   bigint('input_tokens', { mode: 'number' }).notNull().default(0),
  outputTokens:  bigint('output_tokens', { mode: 'number' }).notNull().default(0),
})

export const timesheetRecords = pgTable('timesheet_records', {
  id:          serial('id').primaryKey(),
  analysisId:  integer('analysis_id').notNull().references(() => timesheetAnalyses.id, { onDelete: 'cascade' }),
  date:        text('date').notNull(), // dd/MM/yyyy

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

export type TimesheetAnalysis    = typeof timesheetAnalyses.$inferSelect
export type NewTimesheetAnalysis = typeof timesheetAnalyses.$inferInsert
export type TimesheetRecord      = typeof timesheetRecords.$inferSelect
