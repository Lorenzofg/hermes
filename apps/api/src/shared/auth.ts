import type { FastifyRequest, FastifyReply } from 'fastify'

export interface JwtPayload {
  id: number
  email: string
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Não autorizado' })
  }
}
