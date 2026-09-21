import { ref } from 'vue'
import axios from 'axios'
import { useAuth } from './useAuth'
import type { Payslip, PageLogEntry, AIProvider } from '@hermes/types'

interface PreviewResponse {
  payslips: Payslip[]
  warnings: string[]
  pageLog: PageLogEntry[]
  usage: { inputTokens: number; outputTokens: number }
  fileName: string
}

export function usePayslip() {
  const { authHeader } = useAuth()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const progress = ref<{ current: number; total: number } | null>(null)

  async function analyzePreview(
    file: File,
    provider: AIProvider,
  ): Promise<PreviewResponse | null> {
    loading.value = true
    error.value = null
    progress.value = null

    try {
      const form = new FormData()
      form.append('file', file)

      const response = await fetch(`/api/payslip/preview-stream?provider=${provider}`, {
        method: 'POST',
        headers: authHeader(),
        body: form,
      })

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null)
        error.value = body?.error ?? 'Falha ao analisar o holerite.'
        return null
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let result: PreviewResponse | null = null

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
            result = event
          } else if (event.type === 'error') {
            error.value = event.message
          }
        }
      }

      return result
    } catch {
      error.value = 'Falha ao analisar o holerite.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveAnalysis(
    payslips: Payslip[],
    warnings: string[],
    provider: AIProvider,
    fileName: string,
    usage?: { inputTokens: number; outputTokens: number },
    pageLog?: PageLogEntry[],
  ): Promise<{ analysisId: number } | null> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post<{ analysisId: number }>('/api/payslip/save', {
        payslips,
        warnings,
        pageLog: pageLog ?? [],
        provider,
        fileName,
        inputTokens:  usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
      })
      return data
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e)
        ? (e.response?.data?.error ?? 'Falha ao salvar.')
        : 'Erro inesperado.'
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, progress, analyzePreview, saveAnalysis }
}
