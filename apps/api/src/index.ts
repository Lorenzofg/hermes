import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import jwt from '@fastify/jwt'
import { authController } from './modules/auth/controller.js'
import { settingsController } from './modules/settings/controller.js'
import { timesheetController } from './modules/timesheet/controller.js'
import { timesheetBatchController } from './modules/timesheet-batch/controller.js'
import { payslipController } from './modules/payslip/controller.js'
import { pdfCutController } from './modules/pdf-cut/controller.js'
import { runMigrations } from './db/migrate.js'
import { getHistory } from './shared/history.js'
import { requireAuth } from './shared/auth.js'

if (!process.env.JWT_SECRET) throw new Error('Missing required env var: JWT_SECRET')

// Fastify's default bodyLimit is 1MiB, which silently 413s any real PDF
// upload before the app's own code (or the nicer "PDF too large" message
// below) ever runs — raise it to match the multipart fileSize limit. Sized
// for Cut PDF's 200MB ceiling; analysis flows enforce their own smaller
// MAX_PDF_BYTES check inside each controller.
const app = Fastify({ logger: true, bodyLimit: 210 * 1024 * 1024 })

await runMigrations()

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
})

await app.register(multipart, {
  limits: { fileSize: 210 * 1024 * 1024 }, // hard cap; PDF-specific check is in each controller
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET,
})

await app.register(authController,           { prefix: '/api/auth' })
await app.register(settingsController,        { prefix: '/api/settings' })
await app.register(timesheetController,      { prefix: '/api/timesheet' })
await app.register(timesheetBatchController, { prefix: '/api/timesheet-batch' })
await app.register(payslipController,        { prefix: '/api/payslip' })
await app.register(pdfCutController,         { prefix: '/api/pdf-cut' })

app.get('/health', async () => ({ status: 'ok' }))
app.get('/api/history', { preHandler: requireAuth }, async (request, reply) =>
  reply.send(await getHistory(request.user.id)),
)

const port = Number(process.env.PORT ?? 3000)

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`API running at http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
