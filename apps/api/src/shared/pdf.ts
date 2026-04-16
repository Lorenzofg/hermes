import { PDFDocument } from 'pdf-lib'

const CHUNK_SIZE = 20 // pages per chunk

/**
 * Splits a PDF buffer into chunks of CHUNK_SIZE pages.
 * Returns each chunk as a base64 string ready for the AI.
 */
export async function splitPdfIntoChunks(pdfBase64: string): Promise<string[]> {
  const pdfBytes = Buffer.from(pdfBase64, 'base64')
  const srcDoc = await PDFDocument.load(pdfBytes)
  const totalPages = srcDoc.getPageCount()

  const chunks: string[] = []

  for (let start = 0; start < totalPages; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, totalPages)
    const chunkDoc = await PDFDocument.create()
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i)
    const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices)
    copiedPages.forEach((page) => chunkDoc.addPage(page))

    const chunkBytes = await chunkDoc.save()
    chunks.push(Buffer.from(chunkBytes).toString('base64'))
  }

  return chunks
}
