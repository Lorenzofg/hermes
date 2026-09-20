import type { FastifyInstance } from 'fastify'
import { processPayslip } from './processor.js'
import { saveAnalysis, listAnalyses, getAnalysis } from './service.js'
import { startSSE, sendEvent, endSSE } from '../../shared/sse.js'
import { MAX_PDF_BYTES } from '../../shared/pdf.js'
import { requireAuth } from '../../shared/auth.js'
import { getCredentials } from '../settings/service.js'
import type { Payslip, PageLogEntry, AIProvider } from '@hermes/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024)

export async function payslipController(app: FastifyInstance) {

  // POST /api/payslip/preview
  app.post<{ Querystring: { provider?: AIProvider } }>(
    '/preview',
    { preHandler: requireAuth },
    async (request, reply) => {
      const provider = request.query.provider ?? 'claude'

      const credentials = await getCredentials(request.user.id, provider)
      if (!credentials) {
        return reply.status(400).send({ error: `Configure your ${provider} API key and model in Settings first.` })
      }

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'No file uploaded.' })

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({ error: `Unsupported file type: ${file.mimetype}.` })
      }

      if (file.mimetype === 'application/pdf' && provider !== 'claude' && provider !== 'gemini') {
        return reply.status(400).send({ error: 'PDF files are only supported with the Claude or Gemini provider.' })
      }

      const chunks: Buffer[] = []
      for await (const chunk of file.file) chunks.push(chunk)
      const base64 = Buffer.concat(chunks).toString('base64')

      const result = await processPayslip(base64, file.mimetype, provider, credentials)

      return reply.status(200).send({
        payslips: result.payslips,
        warnings: result.warnings,
        pageLog:  result.pageLog,
        usage:    result.usage,
        fileName: file.filename,
      })
    },
  )

  // POST /api/payslip/preview-stream  (SSE)
  app.post<{ Querystring: { provider?: AIProvider } }>(
    '/preview-stream',
    { preHandler: requireAuth },
    async (request, reply) => {
      const provider = request.query.provider ?? 'claude'

      const credentials = await getCredentials(request.user.id, provider)
      if (!credentials) {
        return reply.status(400).send({ error: `Configure your ${provider} API key and model in Settings first.` })
      }

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'No file uploaded.' })

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({ error: `Unsupported file type: ${file.mimetype}.` })
      }

      if (file.mimetype === 'application/pdf' && provider !== 'claude' && provider !== 'gemini') {
        return reply.status(400).send({ error: 'PDF files are only supported with the Claude or Gemini provider.' })
      }

      const fileChunks: Buffer[] = []
      for await (const chunk of file.file) fileChunks.push(chunk)
      const buffer = Buffer.concat(fileChunks)

      if (file.mimetype === 'application/pdf' && buffer.length > MAX_PDF_BYTES) {
        return reply.status(400).send({ error: `PDF too large. Maximum allowed size is ${MAX_PDF_MB} MB.` })
      }

      const base64   = buffer.toString('base64')
      const fileName = file.filename
      const mimeType = file.mimetype

      startSSE(reply)

      try {
        const result = await processPayslip(base64, mimeType, provider, credentials, (current, total) => {
          sendEvent(reply, { type: 'progress', current, total })
        })

        sendEvent(reply, {
          type:     'result',
          payslips: result.payslips,
          warnings: result.warnings,
          pageLog:  result.pageLog,
          usage:    result.usage,
          fileName,
        })
      } catch (err: any) {
        sendEvent(reply, { type: 'error', message: err?.message ?? 'Processing failed.' })
      }

      endSSE(reply)
    },
  )

  // POST /api/payslip/save — saves all payslips from one PDF in a single analysis
  app.post<{ Body: { payslips: Payslip[]; warnings: string[]; pageLog?: PageLogEntry[]; provider: AIProvider; fileName: string; inputTokens?: number; outputTokens?: number } }>(
    '/save',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { payslips, warnings = [], pageLog = [], provider, fileName, inputTokens = 0, outputTokens = 0 } = request.body

      if (!payslips || payslips.length === 0) {
        return reply.status(400).send({ error: 'No payslips provided.' })
      }

      const record = await saveAnalysis({ userId: request.user.id, provider, fileName, payslips, warnings, pageLog, inputTokens, outputTokens })

      return reply.status(201).send({ analysisId: record.id })
    },
  )

  // GET /api/payslip/analyses
  app.get('/analyses', { preHandler: requireAuth }, async (request, reply) => {
    return reply.send(await listAnalyses(request.user.id))
  })

  // GET /api/payslip/analyses/:id
  app.get<{ Params: { id: string } }>('/analyses/:id', { preHandler: requireAuth }, async (request, reply) => {
    const id = Number(request.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'Invalid ID.' })

    const analysis = await getAnalysis(id, request.user.id)
    if (!analysis) return reply.status(404).send({ error: 'Analysis not found.' })

    return reply.send(analysis)
  })
}
