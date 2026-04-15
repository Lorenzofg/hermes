import { ref } from 'vue'
import axios from 'axios'
import type { AnalyzeTimesheetResponse, DayEntry } from '@cris/types'

export function useTimesheet() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function analyzePreview(
    file: File,
    provider: 'claude' | 'gpt',
  ): Promise<(AnalyzeTimesheetResponse & { fileName: string }) | null> {
    loading.value = true
    error.value = null

    try {
      const form = new FormData()
      form.append('file', file)

      const { data } = await axios.post<AnalyzeTimesheetResponse & { fileName: string }>(
        `/api/analyze/preview?provider=${provider}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e)
        ? (e.response?.data?.error ?? 'Failed to analyze the timesheet.')
        : 'Unexpected error.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveAnalysis(
    days: DayEntry[],
    provider: 'claude' | 'gpt',
    fileName: string,
    warnings: string[],
  ): Promise<{ analysisId: number; csvContent: string } | null> {
    loading.value = true
    error.value = null

    try {
      const { data } = await axios.post<{ analysisId: number; csvContent: string }>('/api/save', {
        days,
        provider,
        fileName,
        warnings,
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

  function downloadCsv(csvContent: string, analysisId?: number) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `timesheet${analysisId ? `_${analysisId}` : ''}_pjecalc.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return { loading, error, analyzePreview, saveAnalysis, downloadCsv }
}
