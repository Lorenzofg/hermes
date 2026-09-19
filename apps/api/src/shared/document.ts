import { callClaude, callGpt, callGemini, type TokenUsage } from './ai.js'
import { splitPdfIntoPages } from './pdf.js'
import type { AIProvider } from '@hermes/types'

const PAGE_CONCURRENCY = 6

export interface PageLogEntry {
  page: number
  status: 'ok' | 'error'
  detail?: string // raw AI error text when status is 'error'
}

export interface PageResult<T> {
  page: number
  data: T
}

export interface PagedAnalysis<T> {
  pages: PageResult<T>[]
  usage: TokenUsage
  pageLog: PageLogEntry[]
}

/**
 * Analyzes a document with the AI one page at a time (PDFs are split into
 * single-page documents first; images are already a single "page"). Calling
 * per page keeps model attention focused on one page's worth of detail
 * instead of diluting it across a whole multi-page document, which is what
 * was causing missed/garbled records on long PDFs.
 *
 * A page that fails (bad AI response, API error, etc.) doesn't abort the
 * whole document — it's recorded in pageLog with the raw error so it can be
 * reviewed later, and processing continues for the remaining pages.
 */
export async function analyzeByPage<T>(
  fileBase64: string,
  mimeType: string,
  prompt: string,
  provider: AIProvider,
  onProgress?: (current: number, total: number) => void,
): Promise<PagedAnalysis<T>> {
  const isPdf = mimeType === 'application/pdf'
  const pages = isPdf ? await splitPdfIntoPages(fileBase64) : [fileBase64]

  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
  const results: (T | undefined)[] = new Array(pages.length)
  const pageLog: PageLogEntry[] = new Array(pages.length)
  let completed = 0
  let nextIndex = 0

  async function worker() {
    while (true) {
      const i = nextIndex++
      if (i >= pages.length) return

      try {
        const result =
          provider === 'gpt'
            ? await callGpt<T>(prompt, pages[i], mimeType)
            : provider === 'gemini'
              ? await callGemini<T>(prompt, pages[i], isPdf ? 'application/pdf' : mimeType)
              : await callClaude<T>(prompt, pages[i], isPdf ? 'application/pdf' : mimeType)

        results[i] = result.data
        usage.inputTokens += result.usage.inputTokens
        usage.outputTokens += result.usage.outputTokens
        pageLog[i] = { page: i + 1, status: 'ok' }
      } catch (err: any) {
        pageLog[i] = { page: i + 1, status: 'error', detail: err?.message ?? String(err) }
      }

      completed++
      onProgress?.(completed, pages.length)
    }
  }

  const workerCount = Math.min(PAGE_CONCURRENCY, pages.length)
  await Promise.all(Array.from({ length: workerCount }, worker))

  const pagesData: PageResult<T>[] = []
  for (let i = 0; i < results.length; i++) {
    const data = results[i]
    if (data !== undefined) pagesData.push({ page: i + 1, data })
  }

  return { pages: pagesData, usage, pageLog }
}
