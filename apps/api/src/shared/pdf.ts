import { PDFDocument } from 'pdf-lib'

const CHUNK_SIZE = 20 // pages per chunk

export async function splitPdfIntoChunks(pdfBase64: string): Promise<string[]> {
  const pdfBytes = Buffer.from(pdfBase64, 'base64')

  let srcDoc: PDFDocument
  try {
    srcDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false })
  } catch {
    // PDF cannot be parsed by pdf-lib — send as-is and let the AI handle it
    return [pdfBase64]
  }

  const totalPages = srcDoc.getPageCount()

  // No splitting needed — avoid re-encoding and potential pdf-lib issues
  if (totalPages <= CHUNK_SIZE) return [pdfBase64]

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
