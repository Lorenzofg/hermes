import type { FastifyInstance } from 'fastify'
import { callClaude, callGpt } from '../../shared/ai.js'
import { TIMESHEET_PROMPT } from './prompt.js'
import { generateCsv, saveAnalysis, listAnalyses, getAnalysis } from './service.js'
import type { AnalyzeTimesheetResponse, DayEntry } from '@hermes/types'

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

      const result =
        provider === 'gpt'
          ? await callGpt(TIMESHEET_PROMPT, base64, file.mimetype)
          : await callClaude(TIMESHEET_PROMPT, base64, file.mimetype)

      const csvContent = generateCsv(result.days)

      const response: AnalyzeTimesheetResponse & { fileName: string } = {
        days:      result.days,
        csvContent,
        totalDays: result.days.length,
        warnings:  result.warnings,
        fileName:  file.filename,
      }

      return reply.status(200).send(response)
    },
  )

  // POST /api/timesheet/save
  app.post<{ Body: { days: DayEntry[]; provider: 'claude' | 'gpt'; fileName: string; warnings: string[] } }>(
    '/save',
    async (request, reply) => {
      const { days, provider, fileName, warnings } = request.body

      if (!days || !Array.isArray(days) || days.length === 0) {
        return reply.status(400).send({ error: 'No days provided.' })
      }

      const csvContent = generateCsv(days)
      const record = await saveAnalysis({ provider, fileName, days, warnings, csvContent })

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
