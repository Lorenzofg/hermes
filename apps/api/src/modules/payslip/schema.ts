import { pgTable, serial, integer, text, numeric, timestamp, bigint, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { providerEnum } from '../../db/enums.js'
import type { PageLogEntry } from '@hermes/types'

// One row per PDF upload
export const payslipAnalyses = pgTable('payslip_analyses', {
  id:           serial('id').primaryKey(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  provider:     providerEnum('provider').notNull(),
  fileName:     text('file_name').notNull(),
  warnings:     text('warnings').array().notNull().default(sql`'{}'`),
  pageLog:      jsonb('page_log').$type<PageLogEntry[]>().notNull().default(sql`'[]'`),
  inputTokens:  bigint('input_tokens', { mode: 'number' }).notNull().default(0),
  outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
})

// One row per payslip within an analysis
export const payslipRecords = pgTable('payslip_records', {
  id:              serial('id').primaryKey(),
  analysisId:      integer('analysis_id').notNull().references(() => payslipAnalyses.id, { onDelete: 'cascade' }),
  competence:      text('competence').notNull().default(''),
  employeeName:    text('employee_name').notNull().default(''),
  cpf:             text('cpf').notNull().default(''),
  role:            text('role').notNull().default(''),
  admissionDate:   text('admission_date').notNull().default(''),
  baseSalary:      numeric('base_salary', { precision: 10, scale: 2 }).notNull().default('0'),
  totalEarnings:   numeric('total_earnings', { precision: 10, scale: 2 }).notNull().default('0'),
  totalDeductions: numeric('total_deductions', { precision: 10, scale: 2 }).notNull().default('0'),
  netSalary:       numeric('net_salary', { precision: 10, scale: 2 }).notNull().default('0'),
  fgtsBase:        numeric('fgts_base', { precision: 10, scale: 2 }).notNull().default('0'),
  fgtsAmount:      numeric('fgts_amount', { precision: 10, scale: 2 }).notNull().default('0'),
})

// Earnings and deductions per payslip record
export const payslipItems = pgTable('payslip_items', {
  id:          serial('id').primaryKey(),
  recordId:    integer('record_id').notNull().references(() => payslipRecords.id, { onDelete: 'cascade' }),
  kind:        text('kind').notNull(), // 'earning' | 'deduction'
  description: text('description').notNull(),
  reference:   text('reference').notNull().default(''),
  value:       numeric('value', { precision: 10, scale: 2 }).notNull(),
})

export type PayslipAnalysis    = typeof payslipAnalyses.$inferSelect
export type NewPayslipAnalysis = typeof payslipAnalyses.$inferInsert
export type PayslipRecord      = typeof payslipRecords.$inferSelect
export type PayslipItem        = typeof payslipItems.$inferSelect
