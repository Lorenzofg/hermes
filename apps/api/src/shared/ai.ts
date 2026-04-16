import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

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
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: prompt,
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

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = extractJson(raw)

  let parsed: T
  try {
    parsed = JSON.parse(cleaned) as T
  } catch {
    throw new Error(`AI returned non-JSON response: ${cleaned.slice(0, 120)}`)
  }

  return {
    data: parsed,
    usage: {
      inputTokens:  response.usage.input_tokens,
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
    model: 'gpt-4o',
    max_tokens: 16000,
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
    throw new Error(`AI returned non-JSON response: ${cleaned.slice(0, 120)}`)
  }

  return {
    data: parsed,
    usage: {
      inputTokens:  response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  }
}
