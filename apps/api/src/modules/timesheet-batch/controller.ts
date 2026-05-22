import type { FastifyInstance } from 'fastify'
import { processBatchTimesheet } from './processor.js'
import { saveBatchAnalysis, listBatchAnalyses, getBatchAnalysis, getBatchPersonCsv } from './service.js'
import { startSSE, sendEvent, endSSE } from '../../shared/sse.js'
import { MAX_PDF_BYTES } from '../../shared/pdf.js'
import type { BatchPersonResult } from '@hermes/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024)

export async function timesheetBatchController(app: FastifyInstance) {

  // POST /api/timesheet-batch/preview-stream  (SSE)
  app.post<{ Querystring: { provider?: 'claude' | 'gpt' } }>(
    '/preview-stream',
    async (request, reply) => {
      const provider = request.query.provider ?? 'claude'

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'No file uploaded.' })

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({ error: `Unsupported file type: ${file.mimetype}. Use JPG, PNG, WEBP or PDF.` })
      }

      if (file.mimetype === 'application/pdf' && provider === 'gpt') {
        return reply.status(400).send({ error: 'PDF files are only supported with the Claude provider.' })
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
        const result = await processBatchTimesheet(base64, mimeType, provider)
        sendEvent(reply, { type: 'result', people: result.people, fileName, usage: result.usage })
      } catch (err: any) {
        sendEvent(reply, { type: 'error', message: err?.message ?? 'Processing failed.' })
      }

      endSSE(reply)
    },
  )

  // POST /api/timesheet-batch/save
  app.post<{ Body: { people: BatchPersonResult[]; provider: 'claude' | 'gpt'; fileName: string; inputTokens?: number; outputTokens?: number } }>(
    '/save',
    async (request, reply) => {
      const { people, provider, fileName, inputTokens = 0, outputTokens = 0 } = request.body

      if (!people || !Array.isArray(people) || people.length === 0) {
        return reply.status(400).send({ error: 'No people provided.' })
      }

      const analysis = await saveBatchAnalysis({ provider, fileName, people, inputTokens, outputTokens })
      return reply.status(201).send({ analysisId: analysis.id, totalPeople: analysis.totalPeople })
    },
  )

  // GET /api/timesheet-batch/analyses
  app.get('/analyses', async (_request, reply) => {
    return reply.send(await listBatchAnalyses())
  })

  // GET /api/timesheet-batch/analyses/:id
  app.get<{ Params: { id: string } }>('/analyses/:id', async (request, reply) => {
    const id = Number(request.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'Invalid ID.' })

    const analysis = await getBatchAnalysis(id)
    if (!analysis) return reply.status(404).send({ error: 'Analysis not found.' })

    return reply.send(analysis)
  })

  // GET /api/timesheet-batch/analyses/:id/people/:personId/csv
  app.get<{ Params: { id: string; personId: string } }>(
    '/analyses/:id/people/:personId/csv',
    async (request, reply) => {
      const personId = Number(request.params.personId)
      if (isNaN(personId)) return reply.status(400).send({ error: 'Invalid person ID.' })

      const person = await getBatchPersonCsv(personId)
      if (!person) return reply.status(404).send({ error: 'Person not found.' })

      const safeName = person.personName.replace(/[^a-zA-Z0-9_\-]/g, '_')
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="timesheet_${safeName}_pjecalc.csv"`)
        .send(person.csvContent)
    },
  )
}
