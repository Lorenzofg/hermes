import { callClaude, callGpt, type TokenUsage } from '../../shared/ai.js'
import { splitPdfIntoChunks } from '../../shared/pdf.js'
import { BATCH_TIMESHEET_PROMPT } from './batch-prompt.js'
import type { BatchPersonResult } from '@hermes/types'

interface ChunkResult {
  people: BatchPersonResult[]
}

export interface BatchProcessResult {
  people: BatchPersonResult[]
  usage: TokenUsage
}

export async function processBatchTimesheet(
  fileBase64: string,
  mimeType: string,
  provider: 'claude' | 'gpt',
  onProgress?: (current: number, total: number) => void,
): Promise<BatchProcessResult> {
  const isPdf = mimeType === 'application/pdf'
  const chunks = isPdf ? await splitPdfIntoChunks(fileBase64) : [fileBase64]

  const peopleMap = new Map<string, BatchPersonResult>()
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 }

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length)
    const chunk = chunks[i]
    const result =
      provider === 'gpt'
        ? await callGpt<ChunkResult>(BATCH_TIMESHEET_PROMPT, chunk, mimeType)
        : await callClaude<ChunkResult>(BATCH_TIMESHEET_PROMPT, chunk, isPdf ? 'application/pdf' : mimeType)

    for (const person of (result.data.people ?? [])) {
      const key = person.name.trim().toLowerCase()
      if (peopleMap.has(key)) {
        const existing = peopleMap.get(key)!
        const dayMap = new Map(existing.days.map((d) => [d.date, d]))
        for (const day of person.days) dayMap.set(day.date, day)
        existing.days = Array.from(dayMap.values())
        existing.warnings.push(...person.warnings)
      } else {
        peopleMap.set(key, { name: person.name.trim(), days: person.days, warnings: person.warnings })
      }
    }

    totalUsage.inputTokens  += result.usage.inputTokens
    totalUsage.outputTokens += result.usage.outputTokens
  }

  return { people: Array.from(peopleMap.values()), usage: totalUsage }
}
