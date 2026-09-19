import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface AIResult<T> {
  data: T
  usage: TokenUsage
}

function extractJson(text: string): string {
  // Try to find a JSON object or array anywhere in the response
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (match) return match[1]
  return text.trim()
}

// No fallback on purpose — a guessed model ID silently using the wrong model
// is worse than a clear startup-time error telling you to set it.
function requireModelEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name} (set it to the exact model ID for this provider)`)
  return value
}

export async function callClaude<T>(
  prompt: string,
  fileBase64: string,
  mimeType: string,
): Promise<AIResult<T>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const isPdf = mimeType === 'application/pdf'

  const fileContent = isPdf
    ? {
        type: 'document' as const,
        source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: fileBase64 },
      }
    : {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: fileBase64,
        },
      }

  const response = await client.messages.create({
    model: requireModelEnv('ANTHROPIC_MODEL'),
    max_tokens: 16000,
    // Opus 5 runs adaptive thinking by default (thinking omitted = adaptive).
    // Unlike Sonnet 5, disabling thinking on Opus 5 has known failure modes
    // (tool calls / tags leaking into visible text), so it's left on here —
    // max_tokens is sized up accordingly to leave room for it.
    // The prompt is identical on every page/document — caching it means only the
    // first call in a ~5min window pays full price; every call after reads it at
    // ~10% of the input cost, which matters a lot now that a 64-page PDF means
    // 64 calls all carrying the same system prompt.
    system: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [fileContent, { type: 'text', text: 'Analyze this document and extract all records.' }],
      },
    ],
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error('Response truncated: document chunk is too large for a single AI call.')
  }

  // Defensively find the text block rather than assuming content[0] — a
  // thinking block (or other block type) can be ordered before it.
  const textBlock = response.content.find((block) => block.type === 'text')
  const raw = textBlock && 'text' in textBlock ? textBlock.text : ''
  const cleaned = extractJson(raw)

  let parsed: T
  try {
    parsed = JSON.parse(cleaned) as T
  } catch {
    throw new Error(`AI returned non-JSON response: ${cleaned.slice(0, 4000)}`)
  }

  return {
    data: parsed,
    usage: {
      // cache_creation/cache_read tokens are billed separately from input_tokens
      // by Anthropic (at ~1.25x and ~0.1x the base rate) — folded in here so the
      // reported total reflects real tokens processed, not just the uncached slice.
      inputTokens:  response.usage.input_tokens
        + (response.usage.cache_creation_input_tokens ?? 0)
        + (response.usage.cache_read_input_tokens ?? 0),
      outputTokens: response.usage.output_tokens,
    },
  }
}

export async function callGpt<T>(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<AIResult<T>> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await client.chat.completions.create({
    model: requireModelEnv('OPENAI_MODEL'),
    max_tokens: 4096,
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
          },
          { type: 'text', text: 'Analyze this document and extract all records.' },
        ],
      },
    ],
  })

  const raw = response.choices[0].message.content ?? ''
  const cleaned = extractJson(raw)

  let parsed: T
  try {
    parsed = JSON.parse(cleaned) as T
  } catch {
    throw new Error(`AI returned non-JSON response: ${cleaned.slice(0, 4000)}`)
  }

  return {
    data: parsed,
    usage: {
      inputTokens:  response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  }
}

export async function callGemini<T>(
  prompt: string,
  fileBase64: string,
  mimeType: string,
): Promise<AIResult<T>> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const response = await ai.models.generateContent({
    model: requireModelEnv('GEMINI_MODEL'),
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: 'Analyze this document and extract all records.' },
        ],
      },
    ],
    config: {
      systemInstruction: prompt,
      responseMimeType: 'application/json',
    },
  })

  const raw = response.text ?? ''
  const cleaned = extractJson(raw)

  let parsed: T
  try {
    parsed = JSON.parse(cleaned) as T
  } catch {
    throw new Error(`AI returned non-JSON response: ${cleaned.slice(0, 4000)}`)
  }

  return {
    data: parsed,
    usage: {
      inputTokens:  response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  }
}
