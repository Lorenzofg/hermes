import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function callClaude<T>(
  prompt: string,
  fileBase64: string,
  mimeType: string,
): Promise<T> {
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
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: prompt,
    messages: [
      {
        role: 'user',
        content: [fileContent, { type: 'text', text: 'Analyze this document and extract all records.' }],
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(stripMarkdown(raw)) as T
}

export async function callGpt<T>(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<T> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
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
  return JSON.parse(stripMarkdown(raw)) as T
}
