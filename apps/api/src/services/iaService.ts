import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { DayEntry } from '@cris/types'

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

const SYSTEM_PROMPT = `
You are an expert at reading Brazilian labor time cards (cartão de ponto).
Analyze the provided image and extract ALL time records.

Return ONLY valid JSON with the structure below — no markdown, no explanation:
{
  "days": [
    {
      "date": "dd/MM/yyyy",
      "shifts": [
        { "clockIn": "HH:mm", "clockOut": "HH:mm" }
      ]
    }
  ],
  "warnings": ["lista de observações em português"]
}

Rules:
- Maximum 6 shifts per day
- Times in 24h HH:mm format, e.g. "08:00", "17:30"
- Dates in dd/MM/yyyy format, e.g. "01/03/2024"
- If a field is illegible, use empty string ""
- Include ALL days on the card, even those with no records
- Days with no records: shifts = []
- Warnings MUST be written in Brazilian Portuguese (pt-BR). Note missing punches, suspicious times, corrections, etc.
`.trim()

export async function analyzeWithClaude(
  fileBase64: string,
  mimeType: string,
): Promise<{ days: DayEntry[]; warnings: string[] }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const isPdf = mimeType === 'application/pdf'

  const fileContent = isPdf
    ? {
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: 'application/pdf' as const,
          data: fileBase64,
        },
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
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          fileContent,
          { type: 'text', text: 'Analyze this time card and extract all records.' },
        ],
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(stripMarkdown(raw))
}

export async function analyzeWithGpt(
  imageBase64: string,
  mimeType: string,
): Promise<{ days: DayEntry[]; warnings: string[] }> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'high',
            },
          },
          { type: 'text', text: 'Analyze this time card and extract all records.' },
        ],
      },
    ],
  })

  const raw = response.choices[0].message.content ?? ''
  return JSON.parse(stripMarkdown(raw))
}
