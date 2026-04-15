import type { FastifyInstance } from 'fastify'
import { analyzeWithClaude, analyzeWithGpt } from '../services/iaService.js'
import { generatePjeCalcCsv } from '../services/csvService.js'
import { saveAnalysis, listAnalyses, getAnalysis } from '../services/analiseService.js'
import type { AnalyzeTimesheetResponse, DayEntry } from '@cris/types'

export async function timesheetRoutes(app: FastifyInstance) {

  // POST /api/analyze/preview — runs AI analysis, does NOT save
  app.post<{
    Querystring: { provider?: 'claude' | 'gpt' }
  }>('/analyze/preview', async (request, reply) => {
    const provider = request.query.provider ?? 'claude'

    const file = await request.file()
    if (!file) return reply.status(400).send({ error: 'No file uploaded.' })

    const { mimetype } = file
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowed.includes(mimetype)) {
      return reply.status(400).send({ error: `Unsupported file type: ${mimetype}. Use JPG, PNG, WEBP or PDF.` })
    }

    if (mimetype === 'application/pdf' && provider === 'gpt') {
      return reply.status(400).send({ error: 'PDF files are only supported with the Claude provider.' })
    }

    const chunks: Buffer[] = []
    for await (const chunk of file.file) chunks.push(chunk)
    const base64 = Buffer.concat(chunks).toString('base64')

    const result =
      provider === 'gpt'
        ? await analyzeWithGpt(base64, mimetype)
        : await analyzeWithClaude(base64, mimetype)

    const csvContent = generatePjeCalcCsv(result.days)

    const response: AnalyzeTimesheetResponse & { fileName: string } = {
      days: result.days,
      csvContent,
      totalDays: result.days.length,
      warnings: result.warnings,
      fileName: file.filename,
    }

    return reply.status(200).send(response)
  })

  // POST /api/save — saves reviewed data to database
  app.post<{
    Body: {
      days: DayEntry[]
      provider: 'claude' | 'gpt'
      fileName: string
      warnings: string[]
    }
  }>('/save', async (request, reply) => {
    const { days, provider, fileName, warnings } = request.body

    if (!days || !Array.isArray(days) || days.length === 0) {
      return reply.status(400).send({ error: 'No days provided.' })
    }

    const csvContent = generatePjeCalcCsv(days)

    const record = await saveAnalysis({ provider, fileName, days, warnings, csvContent })

    return reply.status(201).send({ analysisId: record.id, csvContent })
  })

  // GET /api/analyses — list all analyses
  app.get('/analyses', async (_request, reply) => {
    const list = await listAnalyses()
    return reply.send(list)
  })

  // GET /api/analyses/:id — get single analysis with days
  app.get<{ Params: { id: string } }>('/analyses/:id', async (request, reply) => {
    const id = Number(request.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'Invalid ID.' })

    const analysis = await getAnalysis(id)
    if (!analysis) return reply.status(404).send({ error: 'Analysis not found.' })

    return reply.send(analysis)
  })

  // GET /api/analyses/:id/csv — download saved CSV
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
