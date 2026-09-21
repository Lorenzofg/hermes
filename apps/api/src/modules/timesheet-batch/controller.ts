import type { FastifyInstance } from 'fastify'
import { processBatchTimesheet } from './processor.js'
import { saveBatchAnalysis, listBatchAnalyses, getBatchAnalysis, getBatchPersonCsv, updateBatchPerson } from './service.js'
import { startSSE, sendEvent, endSSE } from '../../shared/sse.js'
import { MAX_PDF_BYTES } from '../../shared/pdf.js'
import { requireAuth } from '../../shared/auth.js'
import { getCredentials } from '../settings/service.js'
import type { BatchPersonResult, DayEntry, PageLogEntry, AIProvider } from '@hermes/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024)

export async function timesheetBatchController(app: FastifyInstance) {

  // POST /api/timesheet-batch/preview-stream  (SSE)
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
        const result = await processBatchTimesheet(base64, mimeType, provider, credentials, (current, total) => {
          sendEvent(reply, { type: 'progress', current, total })
        })
        sendEvent(reply, { type: 'result', people: result.people, pageLog: result.pageLog, fileName, usage: result.usage })
      } catch (err: any) {
        sendEvent(reply, { type: 'error', message: err?.message ?? 'Falha no processamento.' })
      }

      endSSE(reply)
    },
  )

  // POST /api/timesheet-batch/save
  app.post<{ Body: { people: BatchPersonResult[]; provider: AIProvider; fileName: string; pageLog?: PageLogEntry[]; inputTokens?: number; outputTokens?: number } }>(
    '/save',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { people, provider, fileName, pageLog = [], inputTokens = 0, outputTokens = 0 } = request.body

      if (!people || !Array.isArray(people) || people.length === 0) {
        return reply.status(400).send({ error: 'Nenhuma pessoa fornecida.' })
      }

      const analysis = await saveBatchAnalysis({ userId: request.user.id, provider, fileName, people, pageLog, inputTokens, outputTokens })
      return reply.status(201).send({ analysisId: analysis.id, totalPeople: analysis.totalPeople })
    },
  )

  // GET /api/timesheet-batch/analyses
  app.get('/analyses', { preHandler: requireAuth }, async (request, reply) => {
    return reply.send(await listBatchAnalyses(request.user.id))
  })

  // GET /api/timesheet-batch/analyses/:id
  app.get<{ Params: { id: string } }>('/analyses/:id', { preHandler: requireAuth }, async (request, reply) => {
    const id = Number(request.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'ID inválido.' })

    const analysis = await getBatchAnalysis(id, request.user.id)
    if (!analysis) return reply.status(404).send({ error: 'Análise não encontrada.' })

    return reply.send(analysis)
  })

  // PUT /api/timesheet-batch/analyses/:id/people/:personId — overwrite one person's days
  app.put<{ Params: { id: string; personId: string }; Body: { days: DayEntry[] } }>(
    '/analyses/:id/people/:personId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const personId = Number(request.params.personId)
      if (isNaN(personId)) return reply.status(400).send({ error: 'ID de pessoa inválido.' })

      const { days } = request.body
      if (!days || !Array.isArray(days)) {
        return reply.status(400).send({ error: 'Nenhum dia fornecido.' })
      }

      const result = await updateBatchPerson(personId, request.user.id, days)
      if (!result) return reply.status(404).send({ error: 'Pessoa não encontrada.' })

      return reply.send(result)
    },
  )

  // GET /api/timesheet-batch/analyses/:id/people/:personId/csv
  app.get<{ Params: { id: string; personId: string } }>(
    '/analyses/:id/people/:personId/csv',
    { preHandler: requireAuth },
    async (request, reply) => {
      const personId = Number(request.params.personId)
      if (isNaN(personId)) return reply.status(400).send({ error: 'ID de pessoa inválido.' })

      const person = await getBatchPersonCsv(personId, request.user.id)
      if (!person) return reply.status(404).send({ error: 'Pessoa não encontrada.' })

      const safeName = person.personName.replace(/[^a-zA-Z0-9_\-]/g, '_')
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="timesheet_${safeName}_pjecalc.csv"`)
        .send(person.csvContent)
    },
  )
}
