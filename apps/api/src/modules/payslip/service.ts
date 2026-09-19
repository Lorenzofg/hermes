import { db } from '../../db/index.js'
import { payslipAnalyses, payslipRecords, payslipItems } from './schema.js'
import { eq, inArray } from 'drizzle-orm'
import type { Payslip, PageLogEntry, AIProvider } from '@hermes/types'

interface SaveParams {
  provider: AIProvider
  fileName: string
  payslips: Payslip[]
  warnings: string[]
  pageLog: PageLogEntry[]
  inputTokens: number
  outputTokens: number
}

export async function saveAnalysis(params: SaveParams) {
  const { provider, fileName, payslips, warnings, pageLog, inputTokens, outputTokens } = params

  const [analysis] = await db
    .insert(payslipAnalyses)
    .values({ provider, fileName, warnings, pageLog, inputTokens, outputTokens })
    .returning()

  for (const payslip of payslips) {
    const [record] = await db
      .insert(payslipRecords)
      .values({
        analysisId:      analysis.id,
        competence:      payslip.competence,
        employeeName:    payslip.employeeName,
        cpf:             payslip.cpf,
        role:            payslip.role,
        admissionDate:   payslip.admissionDate,
        baseSalary:      String(payslip.baseSalary),
        totalEarnings:   String(payslip.totalEarnings),
        totalDeductions: String(payslip.totalDeductions),
        netSalary:       String(payslip.netSalary),
        fgtsBase:        String(payslip.fgtsBase),
        fgtsAmount:      String(payslip.fgtsAmount),
      })
      .returning()

    const items = [
      ...(payslip.earnings ?? []).map((e) => ({ recordId: record.id, kind: 'earning', description: e.description, reference: e.reference, value: String(e.value) })),
      ...(payslip.deductions ?? []).map((d) => ({ recordId: record.id, kind: 'deduction', description: d.description, reference: d.reference, value: String(d.value) })),
    ]

    if (items.length > 0) {
      await db.insert(payslipItems).values(items)
    }
  }

  return analysis
}

export async function listAnalyses() {
  return db
    .select({
      id:        payslipAnalyses.id,
      createdAt: payslipAnalyses.createdAt,
      provider:  payslipAnalyses.provider,
      fileName:  payslipAnalyses.fileName,
    })
    .from(payslipAnalyses)
    .orderBy(payslipAnalyses.createdAt)
}

export async function getAnalysis(id: number) {
  const [analysis] = await db.select().from(payslipAnalyses).where(eq(payslipAnalyses.id, id))
  if (!analysis) return null

  const records = await db.select().from(payslipRecords).where(eq(payslipRecords.analysisId, id))

  const recordIds = records.map((r) => r.id)
  const allItems = recordIds.length > 0
    ? await db.select().from(payslipItems).where(inArray(payslipItems.recordId, recordIds))
    : []

  const payslips: Payslip[] = records.map((record) => {
    const items = allItems.filter((i) => i.recordId === record.id)
    return {
      competence:      record.competence,
      employeeName:    record.employeeName,
      cpf:             record.cpf,
      role:            record.role,
      admissionDate:   record.admissionDate,
      baseSalary:      Number(record.baseSalary),
      earnings:        items.filter((i) => i.kind === 'earning').map((i) => ({ description: i.description, reference: i.reference, value: Number(i.value) })),
      totalEarnings:   Number(record.totalEarnings),
      deductions:      items.filter((i) => i.kind === 'deduction').map((i) => ({ description: i.description, reference: i.reference, value: Number(i.value) })),
      totalDeductions: Number(record.totalDeductions),
      netSalary:       Number(record.netSalary),
      fgtsBase:        Number(record.fgtsBase),
      fgtsAmount:      Number(record.fgtsAmount),
    }
  })

  return {
    id:        analysis.id,
    fileName:  analysis.fileName,
    provider:  analysis.provider,
    createdAt: analysis.createdAt,
    warnings:  analysis.warnings,
    pageLog:   analysis.pageLog,
    payslips,
  }
}
