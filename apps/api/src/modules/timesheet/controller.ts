import type { FastifyInstance } from 'fastify'
import { processTimesheet } from './processor.js'
import { generateCsv, saveAnalysis, listAnalyses, getAnalysis } from './service.js'
import { startSSE, sendEvent, endSSE } from '../../shared/sse.js'
import { MAX_PDF_BYTES } from '../../shared/pdf.js'
import type { AnalyzeTimesheetResponse, DayEntry, PageLogEntry, AIProvider } from '@hermes/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024)

export async function timesheetController(app: FastifyInstance) {

  // POST /api/timesheet/preview
  app.post<{ Querystring: { provider?: AIProvider } }>(
    '/preview',
    async (request, reply) => {
      const provider = request.query.provider ?? 'claude'

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'No file uploaded.' })

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({ error: `Unsupported file type: ${file.mimetype}. Use JPG, PNG, WEBP or PDF.` })
      }

      if (file.mimetype === 'application/pdf' && provider !== 'claude' && provider !== 'gemini') {
        return reply.status(400).send({ error: 'PDF files are only supported with the Claude or Gemini provider.' })
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
        pageLog:   result.pageLog,
        fileName:  file.filename,
        usage:     result.usage,
      }

      return reply.status(200).send(response)
    },
  )

  // POST /api/timesheet/preview-stream  (SSE)
  app.post<{ Querystring: { provider?: AIProvider } }>(
    '/preview-stream',
    async (request, reply) => {
      const provider = request.query.provider ?? 'claude'

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'No file uploaded.' })

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({ error: `Unsupported file type: ${file.mimetype}. Use JPG, PNG, WEBP or PDF.` })
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
          pageLog:   result.pageLog,
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
  app.post<{ Body: { days: DayEntry[]; provider: AIProvider; fileName: string; warnings: string[]; pageLog?: PageLogEntry[]; inputTokens?: number; outputTokens?: number } }>(
    '/save',
    async (request, reply) => {
      const { days, provider, fileName, warnings, pageLog = [], inputTokens = 0, outputTokens = 0 } = request.body

      if (!days || !Array.isArray(days) || days.length === 0) {
        return reply.status(400).send({ error: 'No days provided.' })
      }

      const csvContent = generateCsv(days)
      const record = await saveAnalysis({ provider, fileName, days, warnings, pageLog, csvContent, inputTokens, outputTokens })

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
