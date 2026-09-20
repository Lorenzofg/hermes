import { analyzeByPage, type PageLogEntry } from '../../shared/document.js'
import { TIMESHEET_PROMPT } from './prompt.js'
import type { TokenUsage, ProviderCredentials } from '../../shared/ai.js'
import type { PageRange } from '../../shared/pdf.js'
import type { DayEntry, AIProvider } from '@hermes/types'

interface RawResult {
  days: DayEntry[]
  warnings: string[]
}

export interface ProcessResult {
  days: DayEntry[]
  warnings: string[]
  usage: TokenUsage
  pageLog: PageLogEntry[]
}

export async function processTimesheet(
  fileBase64: string,
  mimeType: string,
  provider: AIProvider,
  credentials: ProviderCredentials,
  onProgress?: (current: number, total: number) => void,
  pageRange?: PageRange,
): Promise<ProcessResult> {
  const { pages, usage, pageLog } = await analyzeByPage<RawResult>(
    fileBase64,
    mimeType,
    TIMESHEET_PROMPT,
    provider,
    credentials,
    onProgress,
    pageRange,
  )

  const dayMap = new Map<string, DayEntry>()
  const warnings: string[] = []

  for (const { data } of pages) {
    for (const day of data.days ?? []) dayMap.set(day.date, day)
    warnings.push(...(data.warnings ?? []))
  }

  return {
    days: Array.from(dayMap.values()),
    warnings,
    usage,
    pageLog,
  }
}
