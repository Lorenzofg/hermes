import { analyzeByPage, type PageLogEntry } from '../../shared/document.js'
import { PAYSLIP_PROMPT } from './prompt.js'
import type { TokenUsage, ProviderCredentials } from '../../shared/ai.js'
import type { Payslip, AIProvider } from '@hermes/types'

interface AIPayslipResponse {
  payslips: Payslip[]
  warnings: string[]
}

interface ProcessResult {
  payslips: Payslip[]
  warnings: string[]
  usage: TokenUsage
  pageLog: PageLogEntry[]
}

export async function processPayslip(
  fileBase64: string,
  mimeType: string,
  provider: AIProvider,
  credentials: ProviderCredentials,
  onProgress?: (current: number, total: number) => void,
): Promise<ProcessResult> {
  const { pages, usage, pageLog } = await analyzeByPage<AIPayslipResponse>(
    fileBase64,
    mimeType,
    PAYSLIP_PROMPT,
    provider,
    credentials,
    onProgress,
  )

  const payslips: Payslip[] = []
  const warnings: string[] = []

  for (const { data: raw } of pages as { data: any }[]) {
    if (Array.isArray(raw)) {
      payslips.push(
        ...raw.flatMap((item: any) =>
          Array.isArray(item.payslips) ? item.payslips : item.payslip ? [item.payslip] : [item],
        ),
      )
      warnings.push(...raw.flatMap((item: any) => item.warnings ?? []))
    } else {
      payslips.push(...(Array.isArray(raw.payslips) ? raw.payslips : raw.payslip ? [raw.payslip] : []))
      warnings.push(...(raw.warnings ?? []))
    }
  }

  return { payslips, warnings, usage, pageLog }
}
