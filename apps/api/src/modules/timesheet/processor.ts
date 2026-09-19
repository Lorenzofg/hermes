import { analyzeByPage, type PageLogEntry } from '../../shared/document.js'
import { TIMESHEET_PROMPT } from './prompt.js'
import type { TokenUsage } from '../../shared/ai.js'
import type { DayEntry } from '@hermes/types'

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
  provider: 'claude' | 'gpt',
  onProgress?: (current: number, total: number) => void,
): Promise<ProcessResult> {
  const { pages, usage, pageLog } = await analyzeByPage<RawResult>(
    fileBase64,
    mimeType,
    TIMESHEET_PROMPT,
    provider,
    onProgress,
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
