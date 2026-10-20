import type { FastifyRequest } from 'fastify'
import type { AIProvider } from '@hermes/types'
import { MAX_PDF_BYTES, mergePdfs } from './pdf.js'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024)

export type Upload = { buffer: Buffer; mimeType: string; fileName: string } | { error: string }

/**
 * Reads the uploaded file(s) of an analysis request. One file is passed
 * through as-is; several must all be PDFs and are merged into one, in upload
 * order. The size limit applies to the merged result.
 */
export async function readUpload(request: FastifyRequest, provider: AIProvider): Promise<Upload> {
  const files: { buffer: Buffer; mimeType: string; fileName: string }[] = []
  for await (const part of request.files()) {
    if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
      return { error: `Tipo de arquivo não suportado: ${part.mimetype}. Use JPG, PNG, WEBP ou PDF.` }
    }
    files.push({ buffer: await part.toBuffer(), mimeType: part.mimetype, fileName: part.filename })
  }

  if (files.length === 0) return { error: 'Nenhum arquivo enviado.' }
  if (files.length > 1 && files.some((f) => f.mimeType !== 'application/pdf')) {
    return { error: 'Para enviar vários arquivos, todos devem ser PDF.' }
  }

  const upload = files.length === 1
    ? files[0]
    : { buffer: await mergePdfs(files.map((f) => f.buffer)), mimeType: 'application/pdf', fileName: files.map((f) => f.fileName).join(' + ') }

  if (upload.mimeType === 'application/pdf' && provider !== 'claude' && provider !== 'gemini') {
    return { error: 'Arquivos PDF só são suportados com os provedores Claude ou Gemini.' }
  }
  if (upload.mimeType === 'application/pdf' && upload.buffer.length > MAX_PDF_BYTES) {
    return { error: `PDF muito grande. O tamanho máximo permitido é ${MAX_PDF_MB} MB${files.length > 1 ? ' (somando todos os arquivos)' : ''}.` }
  }

  return upload
}
