import type { FastifyInstance } from 'fastify'
import { processTimesheet } from './processor.js'
import { generateCsv, saveAnalysis, updateAnalysis, listAnalyses, getAnalysis } from './service.js'
import { generatePresumedDays } from './presumed.js'
import { applyAdjustment, type Adjustment } from './adjust.js'
import { PRESUMED_SCHEDULE_PROMPT } from './presumed-prompt.js'
import { ADJUSTMENT_PROMPT } from './adjust-prompt.js'
import { startSSE, sendEvent, endSSE } from '../../shared/sse.js'
import { MAX_PDF_BYTES } from '../../shared/pdf.js'
import { callAIText } from '../../shared/ai.js'
import { requireAuth } from '../../shared/auth.js'
import { getCredentials } from '../settings/service.js'
import type { AnalyzeTimesheetResponse, DayEntry, Shift, PageLogEntry, AIProvider } from '@hermes/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024)

export async function timesheetController(app: FastifyInstance) {

  // POST /api/timesheet/preview
  app.post<{ Querystring: { provider?: AIProvider } }>(
    '/preview',
    { preHandler: requireAuth },
    async (request, reply) => {
      const provider = request.query.provider ?? 'claude'

      const credentials = await getCredentials(request.user.id, provider)
      if (!credentials) {
        return reply.status(400).send({ error: `Configure sua chave de API e o modelo do ${provider} em Configurações primeiro.` })
      }

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({ error: `Tipo de arquivo não suportado: ${file.mimetype}. Use JPG, PNG, WEBP ou PDF.` })
      }

      if (file.mimetype === 'application/pdf' && provider !== 'claude' && provider !== 'gemini') {
        return reply.status(400).send({ error: 'Arquivos PDF só são suportados com os provedores Claude ou Gemini.' })
      }

      const chunks: Buffer[] = []
      for await (const chunk of file.file) chunks.push(chunk)
      const base64 = Buffer.concat(chunks).toString('base64')

      const result = await processTimesheet(base64, file.mimetype, provider, credentials)
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
    { preHandler: requireAuth },
    async (request, reply) => {
      const provider = request.query.provider ?? 'claude'

      const credentials = await getCredentials(request.user.id, provider)
      if (!credentials) {
        return reply.status(400).send({ error: `Configure sua chave de API e o modelo do ${provider} em Configurações primeiro.` })
      }

      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'Nenhum arquivo enviado.' })

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({ error: `Tipo de arquivo não suportado: ${file.mimetype}. Use JPG, PNG, WEBP ou PDF.` })
      }

      if (file.mimetype === 'application/pdf' && provider !== 'claude' && provider !== 'gemini') {
        return reply.status(400).send({ error: 'Arquivos PDF só são suportados com os provedores Claude ou Gemini.' })
      }

      const fileChunks: Buffer[] = []
      for await (const chunk of file.file) fileChunks.push(chunk)
      const buffer = Buffer.concat(fileChunks)

      if (file.mimetype === 'application/pdf' && buffer.length > MAX_PDF_BYTES) {
        return reply.status(400).send({ error: `PDF muito grande. O tamanho máximo permitido é ${MAX_PDF_MB} MB.` })
      }

      const base64   = buffer.toString('base64')
      const fileName = file.filename
      const mimeType = file.mimetype

      startSSE(reply)

      try {
        const result = await processTimesheet(base64, mimeType, provider, credentials, (current, total) => {
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
        sendEvent(reply, { type: 'error', message: err?.message ?? 'Falha no processamento.' })
      }

      endSSE(reply)
    },
  )

  // POST /api/timesheet/presumed-preview — generates a "jornada presumida":
  // given a judge's determination text describing a weekly work pattern
  // (days + hours) for a period without real timesheet records, extracts
  // that pattern with the AI and expands it into day entries across a
  // manually-chosen date range.
  app.post<{ Body: { text: string; dateFrom: string; dateTo: string; provider?: AIProvider } }>(
    '/presumed-preview',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { text, dateFrom, dateTo } = request.body
      const provider = request.body.provider ?? 'claude'

      if (!text?.trim()) {
        return reply.status(400).send({ error: 'O texto da determinação é obrigatório.' })
      }
      if (!dateFrom || !dateTo) {
        return reply.status(400).send({ error: 'As datas de início e fim são obrigatórias.' })
      }

      const credentials = await getCredentials(request.user.id, provider)
      if (!credentials) {
        return reply.status(400).send({ error: `Configure sua chave de API e o modelo do ${provider} em Configurações primeiro.` })
      }

      let workDays: string[]
      let shifts: Shift[]
      let warnings: string[]
      let usage: { inputTokens: number; outputTokens: number }
      try {
        const result = await callAIText<{ workDays?: string[]; shifts?: Shift[]; warnings?: string[] }>(
          PRESUMED_SCHEDULE_PROMPT,
          text,
          provider,
          credentials,
        )
        workDays = result.data.workDays ?? []
        shifts   = result.data.shifts ?? []
        warnings = result.data.warnings ?? []
        usage    = result.usage
      } catch (err: any) {
        return reply.status(400).send({ error: err?.message ?? 'Falha ao interpretar a determinação.' })
      }

      if (workDays.length === 0 || shifts.length === 0) {
        return reply.status(400).send({ error: 'Não foi possível identificar um padrão de jornada no texto informado.' })
      }

      const days = generatePresumedDays(workDays, shifts, dateFrom, dateTo)
      const csvContent = generateCsv(days)

      const response: AnalyzeTimesheetResponse & { fileName: string; usage: typeof usage } = {
        days,
        csvContent,
        totalDays: days.length,
        warnings,
        pageLog: [],
        fileName: `Jornada Presumida ${dateFrom}-${dateTo}`,
        usage,
      }

      return reply.status(200).send(response)
    },
  )

  // POST /api/timesheet/adjust-preview — applies a judge's determination over
  // days already on the table ("o intervalo foi de 1h, não de 2h"). The AI only
  // reads WHICH adjustment was determined; the arithmetic is done in code.
  app.post<{ Body: { days: DayEntry[]; text: string; dateFrom?: string; dateTo?: string; provider?: AIProvider } }>(
    '/adjust-preview',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { days, text, dateFrom, dateTo } = request.body
      const provider = request.body.provider ?? 'claude'

      if (!days || !Array.isArray(days) || days.length === 0) {
        return reply.status(400).send({ error: 'Nenhum dia fornecido.' })
      }
      if (!text?.trim()) {
        return reply.status(400).send({ error: 'O texto da determinação é obrigatório.' })
      }

      const credentials = await getCredentials(request.user.id, provider)
      if (!credentials) {
        return reply.status(400).send({ error: `Configure sua chave de API e o modelo do ${provider} em Configurações primeiro.` })
      }

      // The AI answers an empty list when the text describes no applicable
      // adjustment — rejected below, as is any entry with an unknown op.
      let result
      try {
        result = await callAIText<{ adjustments?: Adjustment[]; warnings?: string[] }>(ADJUSTMENT_PROMPT, text, provider, credentials)
      } catch (err: any) {
        return reply.status(400).send({ error: err?.message ?? 'Falha ao interpretar a determinação.' })
      }

      const { adjustments = [], warnings = [] } = result.data
      if (adjustments.length === 0 || adjustments.some((a) => !['break', 'breakMinutes', 'setShifts'].includes(a.op))) {
        return reply.status(400).send({
          error: warnings[0] ?? 'Não foi possível identificar um ajuste aplicável no texto informado.',
        })
      }

      const adjusted = applyAdjustment(days, adjustments, dateFrom, dateTo)

      return reply.status(200).send({
        days:      adjusted,
        csvContent: generateCsv(adjusted),
        totalDays: adjusted.length,
        warnings,
        usage:     result.usage,
      })
    },
  )

  // POST /api/timesheet/save
  app.post<{ Body: { days: DayEntry[]; provider: AIProvider; fileName: string; warnings: string[]; pageLog?: PageLogEntry[]; inputTokens?: number; outputTokens?: number } }>(
    '/save',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { days, provider, fileName, warnings, pageLog = [], inputTokens = 0, outputTokens = 0 } = request.body

      if (!days || !Array.isArray(days) || days.length === 0) {
        return reply.status(400).send({ error: 'Nenhum dia fornecido.' })
      }

      const csvContent = generateCsv(days)
      const record = await saveAnalysis({ userId: request.user.id, provider, fileName, days, warnings, pageLog, csvContent, inputTokens, outputTokens })

      return reply.status(201).send({ analysisId: record.id, csvContent })
    },
  )

  // POST /api/timesheet/export-csv — generate a CSV without saving to history
  app.post<{ Body: { days: DayEntry[] } }>(
    '/export-csv',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { days } = request.body
      if (!days || !Array.isArray(days) || days.length === 0) {
        return reply.status(400).send({ error: 'Nenhum dia fornecido.' })
      }
      return reply.send({ csvContent: generateCsv(days) })
    },
  )

  // GET /api/timesheet/analyses
  app.get('/analyses', { preHandler: requireAuth }, async (request, reply) => {
    return reply.send(await listAnalyses(request.user.id))
  })

  // GET /api/timesheet/analyses/:id
  app.get<{ Params: { id: string } }>('/analyses/:id', { preHandler: requireAuth }, async (request, reply) => {
    const id = Number(request.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'ID inválido.' })

    const analysis = await getAnalysis(id, request.user.id)
    if (!analysis) return reply.status(404).send({ error: 'Análise não encontrada.' })

    return reply.send(analysis)
  })

  // PUT /api/timesheet/analyses/:id — overwrite a saved analysis's days
  app.put<{ Params: { id: string }; Body: { days: DayEntry[] } }>(
    '/analyses/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const id = Number(request.params.id)
      if (isNaN(id)) return reply.status(400).send({ error: 'ID inválido.' })

      const { days } = request.body
      if (!days || !Array.isArray(days)) {
        return reply.status(400).send({ error: 'Nenhum dia fornecido.' })
      }

      const result = await updateAnalysis(id, request.user.id, days)
      if (!result) return reply.status(404).send({ error: 'Análise não encontrada.' })

      return reply.send(result)
    },
  )

  // GET /api/timesheet/analyses/:id/csv
  app.get<{ Params: { id: string } }>('/analyses/:id/csv', { preHandler: requireAuth }, async (request, reply) => {
    const id = Number(request.params.id)
    const analysis = await getAnalysis(id, request.user.id)
    if (!analysis) return reply.status(404).send({ error: 'Análise não encontrada.' })

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="timesheet_${id}_pjecalc.csv"`)
      .send(analysis.csvContent)
  })
}
