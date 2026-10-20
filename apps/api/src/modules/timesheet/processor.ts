import { analyzeByPage, type PageLogEntry } from '../../shared/document.js'
import { TIMESHEET_PROMPT } from './prompt.js'
import type { TokenUsage, ProviderCredentials } from '../../shared/ai.js'
import { monthWarnings, type Leave } from '../../shared/months.js'
import type { DayEntry, AIProvider } from '@hermes/types'

interface RawResult {
  days: DayEntry[]
  leaves?: Leave[]
  warnings: string[]
}

export interface ProcessResult {
  days: DayEntry[]
  warnings: string[]
  usage: TokenUsage
  pageLog: PageLogEntry[]
}

const hasPunch = (d: DayEntry) => d.shifts.some((s) => s.clockIn || s.clockOut)

// The same date can show up on two pages (or two merged files): a blank copy
// never overwrites one with punches.
export function keepPunched(dayMap: Map<string, DayEntry>, day: DayEntry) {
  const prev = dayMap.get(day.date)
  if (!prev || hasPunch(day) || !hasPunch(prev)) dayMap.set(day.date, day)
}

export async function processTimesheet(
  fileBase64: string,
  mimeType: string,
  provider: AIProvider,
  credentials: ProviderCredentials,
  onProgress?: (current: number, total: number) => void,
): Promise<ProcessResult> {
  const { pages, usage, pageLog } = await analyzeByPage<RawResult>(
    fileBase64,
    mimeType,
    TIMESHEET_PROMPT,
    provider,
    credentials,
    onProgress,
  )

  const dayMap = new Map<string, DayEntry>()
  const warnings: string[] = []
  const leaves: Leave[] = []

  for (const { data } of pages) {
    for (const day of data.days ?? []) keepPunched(dayMap, day)
    leaves.push(...(data.leaves ?? []))
    warnings.push(...(data.warnings ?? []))
  }

  const days = Array.from(dayMap.values())
  return {
    days,
    warnings: [...warnings, ...monthWarnings(days, leaves)],
    usage,
    pageLog,
  }
}
