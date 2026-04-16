import { callClaude, callGpt, type TokenUsage } from '../../shared/ai.js'
import { splitPdfIntoChunks } from '../../shared/pdf.js'
import { PAYSLIP_PROMPT } from './prompt.js'
import type { Payslip } from '@hermes/types'

interface AIPayslipResponse {
  payslips: Payslip[]
  warnings: string[]
}

interface ProcessResult {
  payslips: Payslip[]
  warnings: string[]
  usage: TokenUsage
}

export async function processPayslip(
  fileBase64: string,
  mimeType: string,
  provider: 'claude' | 'gpt',
  onProgress?: (current: number, total: number) => void,
): Promise<ProcessResult> {
  const isPdf = mimeType === 'application/pdf'
  const chunks = isPdf ? await splitPdfIntoChunks(fileBase64) : [fileBase64]

  const allPayslips: Payslip[] = []
  const allWarnings: string[] = []
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 }

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length)
    const chunk = chunks[i]
    const result =
      provider === 'gpt'
        ? await callGpt<AIPayslipResponse>(PAYSLIP_PROMPT, chunk, mimeType)
        : await callClaude<AIPayslipResponse>(PAYSLIP_PROMPT, chunk, isPdf ? 'application/pdf' : mimeType)

    const raw = result.data as any

    // Normalize: prompt asks for { payslips: [], warnings: [] }
    // but guard against the AI still returning singular or array-at-root
    let payslips: Payslip[]
    let warnings: string[]

    if (Array.isArray(raw)) {
      payslips = raw.flatMap((item: any) =>
        Array.isArray(item.payslips) ? item.payslips : item.payslip ? [item.payslip] : [item],
      )
      warnings = raw.flatMap((item: any) => item.warnings ?? [])
    } else {
      payslips = Array.isArray(raw.payslips)
        ? raw.payslips
        : raw.payslip
          ? [raw.payslip]
          : []
      warnings = raw.warnings ?? []
    }

    allPayslips.push(...payslips)
    allWarnings.push(...warnings)
    totalUsage.inputTokens  += result.usage.inputTokens
    totalUsage.outputTokens += result.usage.outputTokens
  }

  return {
    payslips: allPayslips,
    warnings: allWarnings,
    usage:    totalUsage,
  }
}
