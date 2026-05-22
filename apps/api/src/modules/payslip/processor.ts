import { callClaude, callGpt, type TokenUsage } from '../../shared/ai.js'
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
): Promise<ProcessResult> {
  const isPdf = mimeType === 'application/pdf'

  const result =
    provider === 'gpt'
      ? await callGpt<AIPayslipResponse>(PAYSLIP_PROMPT, fileBase64, mimeType)
      : await callClaude<AIPayslipResponse>(PAYSLIP_PROMPT, fileBase64, isPdf ? 'application/pdf' : mimeType)

  const raw = result.data as any

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

  return { payslips, warnings, usage: result.usage }
}
