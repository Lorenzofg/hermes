import type { FastifyInstance } from 'fastify'
import { createUser, findUserByEmail, verifyPassword } from './service.js'
import { requireAuth } from '../../shared/auth.js'

export async function authController(app: FastifyInstance) {

  // POST /api/auth/register
  app.post<{ Body: { email: string; password: string } }>(
    '/register',
    async (request, reply) => {
      const { email, password } = request.body

      if (!email || !password || password.length < 8) {
        return reply.status(400).send({ error: 'Email and a password of at least 8 characters are required.' })
      }

      const existing = await findUserByEmail(email)
      if (existing) {
        return reply.status(409).send({ error: 'An account with this email already exists.' })
      }

      const user = await createUser(email, password)
      const token = app.jwt.sign({ id: user.id, email: user.email })

      return reply.status(201).send({ token, user: { id: user.id, email: user.email } })
    },
  )

  // POST /api/auth/login
  app.post<{ Body: { email: string; password: string } }>(
    '/login',
    async (request, reply) => {
      const { email, password } = request.body

      if (!email || !password) {
        return reply.status(400).send({ error: 'Email and password are required.' })
      }

      const user = await findUserByEmail(email)
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return reply.status(401).send({ error: 'Invalid email or password.' })
      }

      const token = app.jwt.sign({ id: user.id, email: user.email })

      return reply.send({ token, user: { id: user.id, email: user.email } })
    },
  )

  // GET /api/auth/me
  app.get(
    '/me',
    { preHandler: requireAuth },
    async (request, reply) => reply.send({ user: request.user }),
  )
}
