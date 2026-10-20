import { PDFDocument } from 'pdf-lib'

export const MAX_PDF_BYTES = 70 * 1024 * 1024 // 70 MB — for AI analysis flows (base64-encoded and sent to the model)

// Cut PDF doesn't touch the AI, so it can take much larger files — calculistas
// routinely receive combined PDFs up to ~200MB and need to trim them down first.
export const MAX_PDF_CUT_BYTES = 200 * 1024 * 1024

/**
 * Splits a PDF into one single-page PDF per page, so each page can be sent to
 * the AI in its own call — this keeps the model's attention on one page's
 * worth of detail instead of diluting it across a whole multi-page document.
 * Falls back to returning the original document as a single "page" if it
 * can't be parsed by pdf-lib (e.g. malformed PDFs) or only has one page.
 */
export async function splitPdfIntoPages(pdfBase64: string): Promise<string[]> {
  const pdfBytes = Buffer.from(pdfBase64, 'base64')

  let srcDoc: PDFDocument
  try {
    srcDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false })
  } catch {
    return [pdfBase64]
  }

  const totalPages = srcDoc.getPageCount()
  if (totalPages <= 1) return [pdfBase64]

  const pages: string[] = []
  for (let i = 0; i < totalPages; i++) {
    const doc = await PDFDocument.create()
    const [copiedPage] = await doc.copyPages(srcDoc, [i])
    doc.addPage(copiedPage)
    const bytes = await doc.save()
    pages.push(Buffer.from(bytes).toString('base64'))
  }

  return pages
}

/**
 * Extracts pages [from, to] (1-indexed, inclusive) of a PDF into a single new
 * PDF — for the "Cut PDF" tool, where the user trims a large combined
 * document down to just the part they want, before uploading it for analysis.
 * Takes/returns raw Buffers (no base64) since this never goes near an AI
 * call — for the large files this tool targets, skipping the base64
 * round-trip meaningfully cuts peak memory use.
 */
export async function extractPdfPageRange(pdfBytes: Buffer, from: number, to: number): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false })

  const totalPages = srcDoc.getPageCount()
  const start = Math.max(1, from)
  const end = Math.min(totalPages, to)
  if (start > end) throw new Error(`Intervalo de páginas inválido ${start}-${end}: o documento tem ${totalPages} página(s).`)

  const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i)

  const doc = await PDFDocument.create()
  const copiedPages = await doc.copyPages(srcDoc, indices)
  for (const page of copiedPages) doc.addPage(page)

  return Buffer.from(await doc.save())
}

/**
 * Concatenates several PDFs, in order, into one — so a timesheet split
 * across files is analyzed as a single document (missing months are then
 * detected across all of them).
 */
export async function mergePdfs(files: Buffer[]): Promise<Buffer> {
  const doc = await PDFDocument.create()
  for (const bytes of files) {
    const src = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
    const pages = await doc.copyPages(src, src.getPageIndices())
    for (const page of pages) doc.addPage(page)
  }
  return Buffer.from(await doc.save())
}
