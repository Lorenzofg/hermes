import { ref } from 'vue'
import axios from 'axios'
import type { BatchPersonResult, AnalyzeBatchTimesheetResponse } from '@hermes/types'

export function useBatchTimesheet() {
  const loading  = ref(false)
  const error    = ref<string | null>(null)
  const progress = ref<{ current: number; total: number } | null>(null)

  async function analyzePreview(
    file: File,
    provider: 'claude' | 'gpt',
  ): Promise<AnalyzeBatchTimesheetResponse | null> {
    loading.value  = true
    error.value    = null
    progress.value = null

    try {
      const form = new FormData()
      form.append('file', file)

      const response = await fetch(`/api/timesheet/batch-preview-stream?provider=${provider}`, {
        method: 'POST',
        body: form,
      })

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '')
        error.value = `Request failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
        return null
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let result: AnalyzeBatchTimesheetResponse | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break

          const event = JSON.parse(raw)
          if (event.type === 'progress') {
            progress.value = { current: event.current, total: event.total }
          } else if (event.type === 'result') {
            result = event as AnalyzeBatchTimesheetResponse
          } else if (event.type === 'error') {
            error.value = event.message
          }
        }
      }

      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveAnalysis(
    people: BatchPersonResult[],
    provider: 'claude' | 'gpt',
    fileName: string,
    usage?: { inputTokens: number; outputTokens: number },
  ): Promise<{ analysisId: number; totalPeople: number } | null> {
    loading.value = true
    error.value   = null

    try {
      const { data } = await axios.post<{ analysisId: number; totalPeople: number }>('/api/timesheet/batch-save', {
        people,
        provider,
        fileName,
        inputTokens:  usage?.inputTokens  ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
      })
      return data
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e)
        ? (e.response?.data?.error ?? 'Failed to save.')
        : 'Unexpected error.'
      return null
    } finally {
      loading.value = false
    }
  }

  function downloadPersonCsv(analysisId: number, personId: number, personName: string) {
    const safeName = personName.replace(/[^a-zA-Z0-9_\-]/g, '_')
    const link = document.createElement('a')
    link.href = `/api/timesheet/batch-analyses/${analysisId}/people/${personId}/csv`
    link.download = `timesheet_${safeName}_pjecalc.csv`
    link.click()
  }

  return { loading, error, progress, analyzePreview, saveAnalysis, downloadPersonCsv }
}
