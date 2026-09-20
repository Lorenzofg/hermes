import { PDFDocument } from 'pdf-lib'

export const MAX_PDF_BYTES = 20 * 1024 * 1024 // 20 MB

export interface PageRange {
  from?: number // 1-indexed, inclusive
  to?: number   // 1-indexed, inclusive
}

// Parses optional pageFrom/pageTo query string params into a PageRange,
// or undefined when neither was given (analyze the whole document).
export function parsePageRangeQuery(pageFrom?: string, pageTo?: string): PageRange | undefined {
  if (!pageFrom && !pageTo) return undefined
  return {
    from: pageFrom ? Number(pageFrom) : undefined,
    to:   pageTo ? Number(pageTo) : undefined,
  }
}

/**
 * Splits a PDF into one single-page PDF per page, so each page can be sent to
 * the AI in its own call — this keeps the model's attention on one page's
 * worth of detail instead of diluting it across a whole multi-page document.
 * Falls back to returning the original document as a single "page" if it
 * can't be parsed by pdf-lib (e.g. malformed PDFs) or only has one page.
 *
 * An optional page range lets the caller extract just the pages that matter
 * (e.g. the timesheet buried in pages 5-12 of a larger combined PDF) instead
 * of requiring the file be pre-split externally.
 */
export async function splitPdfIntoPages(pdfBase64: string, range?: PageRange): Promise<string[]> {
  const pdfBytes = Buffer.from(pdfBase64, 'base64')

  let srcDoc: PDFDocument
  try {
    srcDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false })
  } catch {
    return [pdfBase64]
  }

  const totalPages = srcDoc.getPageCount()
  if (!range && totalPages <= 1) return [pdfBase64]

  const from = Math.max(1, range?.from ?? 1)
  const to = Math.min(totalPages, range?.to ?? totalPages)
  if (from > to) throw new Error(`Invalid page range ${from}-${to}: document has ${totalPages} page(s).`)

  const pages: string[] = []
  for (let i = from - 1; i < to; i++) {
    const doc = await PDFDocument.create()
    const [copiedPage] = await doc.copyPages(srcDoc, [i])
    doc.addPage(copiedPage)
    const bytes = await doc.save()
    pages.push(Buffer.from(bytes).toString('base64'))
  }

  return pages
}
