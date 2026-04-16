import { callClaude, callGpt, type TokenUsage } from '../../shared/ai.js'
import { splitPdfIntoChunks } from '../../shared/pdf.js'
import { TIMESHEET_PROMPT } from './prompt.js'
import type { DayEntry } from '@hermes/types'

interface ChunkResult {
  days: DayEntry[]
  warnings: string[]
}

interface ProcessResult {
  days: DayEntry[]
  warnings: string[]
  usage: TokenUsage
}

export async function processTimesheet(
  fileBase64: string,
  mimeType: string,
  provider: 'claude' | 'gpt',
  onProgress?: (current: number, total: number) => void,
): Promise<ProcessResult> {
  const isPdf = mimeType === 'application/pdf'
  const chunks = isPdf ? await splitPdfIntoChunks(fileBase64) : [fileBase64]

  const allDays: DayEntry[] = []
  const allWarnings: string[] = []
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 }

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length)
    const chunk = chunks[i]
    const result =
      provider === 'gpt'
        ? await callGpt<ChunkResult>(TIMESHEET_PROMPT, chunk, mimeType)
        : await callClaude<ChunkResult>(TIMESHEET_PROMPT, chunk, isPdf ? 'application/pdf' : mimeType)

    allDays.push(...(result.data.days ?? []))
    allWarnings.push(...(result.data.warnings ?? []))
    totalUsage.inputTokens  += result.usage.inputTokens
    totalUsage.outputTokens += result.usage.outputTokens
  }

  // Deduplicate days by date — keep last occurrence (later chunk wins)
  const dayMap = new Map<string, DayEntry>()
  for (const day of allDays) dayMap.set(day.date, day)

  return {
    days:     Array.from(dayMap.values()),
    warnings: allWarnings,
    usage:    totalUsage,
  }
}
