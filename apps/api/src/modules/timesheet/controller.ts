import type { FastifyInstance } from 'fastify'
import { processTimesheet } from './processor.js'
import { generateCsv, saveAnalysis, listAnalyses, getAnalysis } from './service.js'
import { processBatchTimesheet } from './batch-processor.js'
import { saveBatchAnalysis, listBatchAnalyses, getBatchAnalysis, getBatchPersonCsv } from './batch-service.js'
import { startSSE, sendEvent, endSSE } from '../../shared/sse.js'
import type { AnalyzeTimesheetResponse, BatchPersonResult, DayEntry } from '@hermes/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

export async function timesheetController(app: FastifyInstance) {

  // POST /api/timesheet/preview
  app.post<{ Querystring: { provider?: 'claude' | 'gpt' } }>(
    '/preview',
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

      const chunks: Buffer[] = []
      for await (const chunk of file.file) chunks.push(chunk)
      const base64 = Buffer.concat(chunks).toString('base64')

      const result = await processTimesheet(base64, file.mimetype, provider)
      const csvContent = generateCsv(result.days)

      const response: AnalyzeTimesheetResponse & { fileName: string; usage: typeof result.usage } = {
        days:      result.days,
        csvContent,
        totalDays: result.days.length,
        warnings:  result.warnings,
        fileName:  file.filename,
        usage:     result.usage,
      }

      return reply.status(200).send(response)
    },
  )

  // POST /api/timesheet/preview-stream  (SSE)
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
      const base64 = Buffer.concat(fileChunks).toString('base64')
      const fileName = file.filename
      const mimeType = file.mimetype

      startSSE(reply)

      try {
        const result = await processTimesheet(base64, mimeType, provider, (current, total) => {
          sendEvent(reply, { type: 'progress', current, total })
        })

        const csvContent = generateCsv(result.days)
        sendEvent(reply, {
          type: 'result',
          days:      result.days,
          csvContent,
          totalDays: result.days.length,
          warnings:  result.warnings,
          fileName,
          usage:     result.usage,
        })
      } catch (err: any) {
        sendEvent(reply, { type: 'error', message: err?.message ?? 'Processing failed.' })
      }

      endSSE(reply)
    },
  )

  // POST /api/timesheet/save
  app.post<{ Body: { days: DayEntry[]; provider: 'claude' | 'gpt'; fileName: string; warnings: string[]; inputTokens?: number; outputTokens?: number } }>(
    '/save',
    async (request, reply) => {
      const { days, provider, fileName, warnings, inputTokens = 0, outputTokens = 0 } = request.body

      if (!days || !Array.isArray(days) || days.length === 0) {
        return reply.status(400).send({ error: 'No days provided.' })
      }

      const csvContent = generateCsv(days)
      const record = await saveAnalysis({ provider, fileName, days, warnings, csvContent, inputTokens, outputTokens })

      return reply.status(201).send({ analysisId: record.id, csvContent })
    },
  )

  // GET /api/timesheet/analyses
  app.get('/analyses', async (_request, reply) => {
    return reply.send(await listAnalyses())
  })

  // GET /api/timesheet/analyses/:id
  app.get<{ Params: { id: string } }>('/analyses/:id', async (request, reply) => {
    const id = Number(request.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'Invalid ID.' })

    const analysis = await getAnalysis(id)
    if (!analysis) return reply.status(404).send({ error: 'Analysis not found.' })

    return reply.send(analysis)
  })

  // ── Batch routes ──────────────────────────────────────────────────────────

  // POST /api/timesheet/batch-preview-stream  (SSE)
  app.post<{ Querystring: { provider?: 'claude' | 'gpt' } }>(
    '/batch-preview-stream',
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
      const base64   = Buffer.concat(fileChunks).toString('base64')
      const fileName = file.filename
      const mimeType = file.mimetype

      startSSE(reply)

      try {
        const result = await processBatchTimesheet(base64, mimeType, provider, (current, total) => {
          sendEvent(reply, { type: 'progress', current, total })
        })

        sendEvent(reply, {
          type:     'result',
          people:   result.people,
          fileName,
          usage:    result.usage,
        })
      } catch (err: any) {
        sendEvent(reply, { type: 'error', message: err?.message ?? 'Processing failed.' })
      }

      endSSE(reply)
    },
  )

  // POST /api/timesheet/batch-save
  app.post<{ Body: { people: BatchPersonResult[]; provider: 'claude' | 'gpt'; fileName: string; inputTokens?: number; outputTokens?: number } }>(
    '/batch-save',
    async (request, reply) => {
      const { people, provider, fileName, inputTokens = 0, outputTokens = 0 } = request.body

      if (!people || !Array.isArray(people) || people.length === 0) {
        return reply.status(400).send({ error: 'No people provided.' })
      }

      const analysis = await saveBatchAnalysis({ provider, fileName, people, inputTokens, outputTokens })
      return reply.status(201).send({ analysisId: analysis.id, totalPeople: analysis.totalPeople })
    },
  )

  // GET /api/timesheet/batch-analyses
  app.get('/batch-analyses', async (_request, reply) => {
    return reply.send(await listBatchAnalyses())
  })

  // GET /api/timesheet/batch-analyses/:id
  app.get<{ Params: { id: string } }>('/batch-analyses/:id', async (request, reply) => {
    const id = Number(request.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'Invalid ID.' })

    const analysis = await getBatchAnalysis(id)
    if (!analysis) return reply.status(404).send({ error: 'Analysis not found.' })

    return reply.send(analysis)
  })

  // GET /api/timesheet/batch-analyses/:id/people/:personId/csv
  app.get<{ Params: { id: string; personId: string } }>(
    '/batch-analyses/:id/people/:personId/csv',
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

  // GET /api/timesheet/analyses/:id/csv
  app.get<{ Params: { id: string } }>('/analyses/:id/csv', async (request, reply) => {
    const id = Number(request.params.id)
    const analysis = await getAnalysis(id)
    if (!analysis) return reply.status(404).send({ error: 'Analysis not found.' })

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="timesheet_${id}_pjecalc.csv"`)
      .send(analysis.csvContent)
  })
}
