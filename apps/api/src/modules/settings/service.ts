import { db } from '../../db/index.js'
import { userSettings } from './schema.js'
import { eq } from 'drizzle-orm'
import { encrypt, decrypt } from '../../shared/crypto.js'
import type { AIProvider } from '@hermes/types'

interface ProviderInput {
  apiKey?: string
  model?: string
  clear?: boolean // wipes the key + model for this provider, ignoring apiKey/model above
}

export interface SaveSettingsInput {
  claude?: ProviderInput
  gpt?: ProviderInput
  gemini?: ProviderInput
}

export interface ProviderStatus {
  configured: boolean
  model: string | null
  keyPreview: string | null // last 4 chars only, never the full key
}

function preview(apiKey: string | null): string | null {
  if (!apiKey) return null
  return `••••${apiKey.slice(-4)}`
}

export async function getMaskedSettings(userId: number): Promise<Record<AIProvider, ProviderStatus>> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId))

  const decryptOrNull = (enc: string | null) => (enc ? decrypt(enc) : null)

  const claudeKey = decryptOrNull(row?.anthropicApiKeyEnc ?? null)
  const gptKey    = decryptOrNull(row?.openaiApiKeyEnc ?? null)
  const geminiKey = decryptOrNull(row?.geminiApiKeyEnc ?? null)

  return {
    claude: { configured: !!claudeKey, model: row?.anthropicModel ?? null, keyPreview: preview(claudeKey) },
    gpt:    { configured: !!gptKey,    model: row?.openaiModel ?? null,    keyPreview: preview(gptKey) },
    gemini: { configured: !!geminiKey, model: row?.geminiModel ?? null,    keyPreview: preview(geminiKey) },
  }
}

export async function saveSettings(userId: number, input: SaveSettingsInput) {
  const values: Record<string, unknown> = { userId }

  if (input.claude?.clear) {
    values.anthropicApiKeyEnc = null
    values.anthropicModel = null
  } else {
    if (input.claude?.apiKey) values.anthropicApiKeyEnc = encrypt(input.claude.apiKey)
    if (input.claude?.model)  values.anthropicModel = input.claude.model
  }

  if (input.gpt?.clear) {
    values.openaiApiKeyEnc = null
    values.openaiModel = null
  } else {
    if (input.gpt?.apiKey) values.openaiApiKeyEnc = encrypt(input.gpt.apiKey)
    if (input.gpt?.model)  values.openaiModel = input.gpt.model
  }

  if (input.gemini?.clear) {
    values.geminiApiKeyEnc = null
    values.geminiModel = null
  } else {
    if (input.gemini?.apiKey) values.geminiApiKeyEnc = encrypt(input.gemini.apiKey)
    if (input.gemini?.model)  values.geminiModel = input.gemini.model
  }

  const updateSet = { ...values }
  delete updateSet.userId

  await db
    .insert(userSettings)
    .values(values as typeof userSettings.$inferInsert)
    .onConflictDoUpdate({ target: userSettings.userId, set: updateSet })
}

// Resolves the decrypted API key + model a request should use for one
// provider. Returns null when the user hasn't configured that provider yet.
export async function getCredentials(
  userId: number,
  provider: AIProvider,
): Promise<{ apiKey: string; model: string } | null> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId))
  if (!row) return null

  const map = {
    claude: { keyEnc: row.anthropicApiKeyEnc, model: row.anthropicModel },
    gpt:    { keyEnc: row.openaiApiKeyEnc,    model: row.openaiModel },
    gemini: { keyEnc: row.geminiApiKeyEnc,    model: row.geminiModel },
  } as const

  const entry = map[provider]
  if (!entry.keyEnc || !entry.model) return null

  return { apiKey: decrypt(entry.keyEnc), model: entry.model }
}
