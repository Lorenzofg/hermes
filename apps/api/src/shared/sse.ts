import type { FastifyReply } from 'fastify'

export function startSSE(reply: FastifyReply) {
  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.flushHeaders()
}

export function sendEvent(reply: FastifyReply, data: object) {
  reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
}

export function endSSE(reply: FastifyReply) {
  reply.raw.write('data: [DONE]\n\n')
  reply.raw.end()
}
