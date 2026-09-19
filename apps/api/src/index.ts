import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { timesheetController } from './modules/timesheet/controller.js'
import { timesheetBatchController } from './modules/timesheet-batch/controller.js'
import { payslipController } from './modules/payslip/controller.js'
import { runMigrations } from './db/migrate.js'
import { getHistory } from './shared/history.js'

const app = Fastify({ logger: true })

await runMigrations()

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
})

await app.register(multipart, {
  limits: { fileSize: 25 * 1024 * 1024 }, // hard cap; PDF-specific check is in each controller
})

await app.register(timesheetController,      { prefix: '/api/timesheet' })
await app.register(timesheetBatchController, { prefix: '/api/timesheet-batch' })
await app.register(payslipController,        { prefix: '/api/payslip' })

app.get('/health', async () => ({ status: 'ok' }))
app.get('/api/history', async (_req, reply) => reply.send(await getHistory()))
app.get('/api/providers', async (_req, reply) => reply.send({
  claude: !!process.env.ANTHROPIC_API_KEY,
  gpt:    !!process.env.OPENAI_API_KEY,
  gemini: !!process.env.GEMINI_API_KEY,
}))

const port = Number(process.env.PORT ?? 3000)

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`API running at http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
