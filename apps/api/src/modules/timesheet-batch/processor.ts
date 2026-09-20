import { analyzeByPage, type PageLogEntry } from '../../shared/document.js'
import { BATCH_TIMESHEET_PROMPT } from './prompt.js'
import type { TokenUsage, ProviderCredentials } from '../../shared/ai.js'
import type { PageRange } from '../../shared/pdf.js'
import type { BatchPersonResult, AIProvider } from '@hermes/types'

interface RawResult {
  people: BatchPersonResult[]
}

export interface BatchProcessResult {
  people: BatchPersonResult[]
  usage: TokenUsage
  pageLog: PageLogEntry[]
}

export async function processBatchTimesheet(
  fileBase64: string,
  mimeType: string,
  provider: AIProvider,
  credentials: ProviderCredentials,
  onProgress?: (current: number, total: number) => void,
  pageRange?: PageRange,
): Promise<BatchProcessResult> {
  const { pages, usage, pageLog } = await analyzeByPage<RawResult>(
    fileBase64,
    mimeType,
    BATCH_TIMESHEET_PROMPT,
    provider,
    credentials,
    onProgress,
    pageRange,
  )

  // Each page is normally one employee, but merge by name anyway in case a
  // person's records span more than one page. Pages are analyzed in isolation
  // (the AI can't see other pages), so it has no way to number illegible names
  // consistently — the prompt tells it to leave those blank, and we fill them
  // in here using the real page number instead, so two different unnamed
  // employees never collide into the same map key.
  const peopleMap = new Map<string, BatchPersonResult>()

  for (const { page: pageNumber, data } of pages) {
    for (const person of data.people ?? []) {
      const name = person.name.trim() || `Funcionário (página ${pageNumber})`
      const key = name.toLowerCase()
      const existing = peopleMap.get(key)

      if (existing) {
        const dayMap = new Map(existing.days.map((d) => [d.date, d]))
        for (const day of person.days) dayMap.set(day.date, day)
        existing.days = Array.from(dayMap.values())
        existing.warnings.push(...person.warnings)
      } else {
        peopleMap.set(key, { name, days: person.days, warnings: person.warnings })
      }
    }
  }

  return { people: Array.from(peopleMap.values()), usage, pageLog }
}
