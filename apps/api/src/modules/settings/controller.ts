import type { FastifyInstance } from 'fastify'
import { getMaskedSettings, saveSettings, type SaveSettingsInput } from './service.js'
import { requireAuth } from '../../shared/auth.js'

export async function settingsController(app: FastifyInstance) {

  // GET /api/settings — never returns the raw API keys, only a masked preview
  app.get(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => reply.send(await getMaskedSettings(request.user.id)),
  )

  // PUT /api/settings — update one or more providers; omit a field to leave it unchanged
  app.put<{ Body: SaveSettingsInput }>(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      await saveSettings(request.user.id, request.body)
      return reply.send(await getMaskedSettings(request.user.id))
    },
  )
}
