import { callClaude, callGpt, type TokenUsage } from '../../shared/ai.js'
import { BATCH_TIMESHEET_PROMPT } from './prompt.js'
import type { BatchPersonResult } from '@hermes/types'

interface RawResult {
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
): Promise<BatchProcessResult> {
  const isPdf = mimeType === 'application/pdf'

  const result =
    provider === 'gpt'
      ? await callGpt<RawResult>(BATCH_TIMESHEET_PROMPT, fileBase64, mimeType)
      : await callClaude<RawResult>(BATCH_TIMESHEET_PROMPT, fileBase64, isPdf ? 'application/pdf' : mimeType)

  return {
    people: result.data.people ?? [],
    usage:  result.usage,
  }
}
