import { PDFDocument } from 'pdf-lib'

export const MAX_PDF_BYTES = 20 * 1024 * 1024 // 20 MB

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
