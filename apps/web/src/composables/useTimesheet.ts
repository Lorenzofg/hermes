import { ref } from 'vue'
import axios from 'axios'
import { useAuth } from './useAuth'
import type { AnalyzeTimesheetResponse, DayEntry, PageLogEntry, AIProvider } from '@hermes/types'

export function useTimesheet() {
  const { authHeader } = useAuth()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const progress = ref<{ current: number; total: number } | null>(null)

  async function analyzePreview(
    file: File,
    provider: AIProvider,
  ): Promise<(AnalyzeTimesheetResponse & { fileName: string; usage: { inputTokens: number; outputTokens: number } }) | null> {
    loading.value = true
    error.value = null
    progress.value = null

    try {
      const form = new FormData()
      form.append('file', file)

      const response = await fetch(`/api/timesheet/preview-stream?provider=${provider}`, {
        method: 'POST',
        headers: authHeader(),
        body: form,
      })

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null)
        error.value = body?.error ?? `Falha na requisição: ${response.status} ${response.statusText}`
        return null
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let result: (AnalyzeTimesheetResponse & { fileName: string; usage: { inputTokens: number; outputTokens: number } }) | null = null

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
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Generates a "jornada presumida" — a judge's determination text describing
  // a weekly work pattern, expanded into day entries across a manually-chosen
  // date range, for periods with no real timesheet records.
  async function analyzePresumed(
    text: string,
    dateFrom: string,
    dateTo: string,
    provider: AIProvider,
  ): Promise<(AnalyzeTimesheetResponse & { fileName: string; usage: { inputTokens: number; outputTokens: number } }) | null> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post('/api/timesheet/presumed-preview', { text, dateFrom, dateTo, provider })
      return data
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e)
        ? (e.response?.data?.error ?? 'Falha ao gerar a jornada presumida.')
        : 'Erro inesperado.'
      return null
    } finally {
      loading.value = false
    }
  }

  // Fills months the defendant never attached with the judge's presumed schedule.
  async function presumeMissing(
    days: DayEntry[],
    months: string[],
    text: string,
    provider: AIProvider,
  ): Promise<{ days: DayEntry[]; warnings: string[]; usage: { inputTokens: number; outputTokens: number } } | null> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post('/api/timesheet/presume-missing', { days, months, text, provider })
      return data
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e)
        ? (e.response?.data?.error ?? 'Falha ao presumir os meses faltantes.')
        : 'Erro inesperado.'
      return null
    } finally {
      loading.value = false
    }
  }

  // Applies a judge's determination over days already on the review table —
  // e.g. the card shows a 12h–14h break but the judge ordered 12h–13h.
  async function adjustDays(
    days: DayEntry[],
    text: string,
    dateFrom: string,
    dateTo: string,
    provider: AIProvider,
  ): Promise<{ days: DayEntry[]; warnings: string[]; usage: { inputTokens: number; outputTokens: number } } | null> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post('/api/timesheet/adjust-preview', {
        days,
        text,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        provider,
      })
      return data
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e)
        ? (e.response?.data?.error ?? 'Falha ao aplicar a determinação.')
        : 'Erro inesperado.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveAnalysis(
    days: DayEntry[],
    provider: AIProvider,
    fileName: string,
    warnings: string[],
    usage?: { inputTokens: number; outputTokens: number },
    pageLog?: PageLogEntry[],
  ): Promise<{ analysisId: number; csvContent: string } | null> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post<{ analysisId: number; csvContent: string }>('/api/timesheet/save', {
        days,
        provider,
        fileName,
        warnings,
        pageLog: pageLog ?? [],
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

  // Overwrites a saved analysis's days — used from History to fix a wrong
  // row or clear a value after the fact.
  async function updateAnalysis(analysisId: number, days: DayEntry[], warnings?: string[]): Promise<{ csvContent: string } | null> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.put<{ csvContent: string }>(`/api/timesheet/analyses/${analysisId}`, { days, warnings })
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

  function downloadCsv(csvContent: string, analysisId?: number) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `timesheet${analysisId ? `_${analysisId}` : ''}_pjecalc.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Generates a CSV from the current (possibly edited) days without saving
  // anything — for "export without committing to history".
  async function exportCsv(days: DayEntry[]): Promise<string | null> {
    try {
      const { data } = await axios.post<{ csvContent: string }>('/api/timesheet/export-csv', { days })
      return data.csvContent
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e) ? (e.response?.data?.error ?? 'Falha ao exportar.') : 'Erro inesperado.'
      return null
    }
  }

  return { loading, error, progress, analyzePreview, analyzePresumed, adjustDays, presumeMissing, saveAnalysis, updateAnalysis, downloadCsv, exportCsv }
}
