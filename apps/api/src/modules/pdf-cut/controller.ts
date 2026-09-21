import type { FastifyInstance } from 'fastify'
import { extractPdfPageRange, MAX_PDF_CUT_BYTES } from '../../shared/pdf.js'
import { requireAuth } from '../../shared/auth.js'

const MAX_PDF_CUT_MB = MAX_PDF_CUT_BYTES / (1024 * 1024)

export async function pdfCutController(app: FastifyInstance) {

  // POST /api/pdf-cut — trims a PDF down to pages [from, to] and returns the
  // resulting file. No AI call, nothing saved — a plain utility so a large
  // combined PDF can be cut down before being uploaded for analysis.
  app.post<{ Querystring: { from?: string; to?: string } }>(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const from = Number(request.query.from)
      const to = Number(request.query.to)

      if (!from || !to) {
        return reply.status(400).send({ error: 'Os números de página inicial e final são obrigatórios.' })
      }

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })

      if (file.mimetype !== 'application/pdf') {
        return reply.status(400).send({ error: 'Somente arquivos PDF são suportados.' })
      }

      const chunks: Buffer[] = []
      for await (const chunk of file.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      if (buffer.length > MAX_PDF_CUT_BYTES) {
        return reply.status(400).send({ error: `PDF muito grande. O tamanho máximo permitido é ${MAX_PDF_CUT_MB} MB.` })
      }

      let cutBytes: Buffer
      try {
        cutBytes = await extractPdfPageRange(buffer, from, to)
      } catch (err: any) {
        return reply.status(400).send({ error: err?.message ?? 'Falha ao cortar o PDF.' })
      }

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="pages_${from}-${to}.pdf"`)
        .send(cutBytes)
    },
  )
}
