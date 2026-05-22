import { callClaude, callGpt, type TokenUsage } from '../../shared/ai.js'
import { TIMESHEET_PROMPT } from './prompt.js'
import type { DayEntry } from '@hermes/types'

interface RawResult {
  days: DayEntry[]
  warnings: string[]
}

export interface ProcessResult {
  days: DayEntry[]
  warnings: string[]
  usage: TokenUsage
}

export async function processTimesheet(
  fileBase64: string,
  mimeType: string,
  provider: 'claude' | 'gpt',
): Promise<ProcessResult> {
  const isPdf = mimeType === 'application/pdf'

  const result =
    provider === 'gpt'
      ? await callGpt<RawResult>(TIMESHEET_PROMPT, fileBase64, mimeType)
      : await callClaude<RawResult>(TIMESHEET_PROMPT, fileBase64, isPdf ? 'application/pdf' : mimeType)

  const days = result.data.days ?? []

  const dayMap = new Map<string, DayEntry>()
  for (const day of days) dayMap.set(day.date, day)

  return {
    days:     Array.from(dayMap.values()),
    warnings: result.data.warnings ?? [],
    usage:    result.usage,
  }
}
