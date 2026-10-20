import { pgTable, integer, text } from 'drizzle-orm/pg-core'
import { users } from '../auth/schema.js'

export const userSettings = pgTable('user_settings', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),

  anthropicApiKeyEnc: text('anthropic_api_key_enc'),
  anthropicModel:     text('anthropic_model'),

  openaiApiKeyEnc: text('openai_api_key_enc'),
  openaiModel:     text('openai_model'),

  geminiApiKeyEnc: text('gemini_api_key_enc'),
  geminiModel:     text('gemini_model'),

  openrouterApiKeyEnc: text('openrouter_api_key_enc'),
  openrouterModel:     text('openrouter_model'),
})

export type UserSettings = typeof userSettings.$inferSelect
