import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { timesheetRoutes } from './routes/ponto.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
})

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

await app.register(timesheetRoutes, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok' }))

const port = Number(process.env.PORT ?? 3001)

try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`API running at http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
