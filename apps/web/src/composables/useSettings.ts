import { ref } from 'vue'
import axios from 'axios'
import type { AIProvider } from '@hermes/types'

export interface ProviderStatus {
  configured: boolean
  model: string | null
  keyPreview: string | null
}

export type SettingsMap = Record<AIProvider, ProviderStatus>

interface ProviderInput {
  apiKey?: string
  model?: string
  clear?: boolean
}

export interface SaveSettingsInput {
  claude?: ProviderInput
  gpt?: ProviderInput
  gemini?: ProviderInput
}

export function useSettings() {
  const settings = ref<SettingsMap | null>(null)
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  async function fetchSettings(): Promise<SettingsMap | null> {
    loading.value = true
    error.value   = null

    try {
      const { data } = await axios.get<SettingsMap>('/api/settings')
      settings.value = data
      return data
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e) ? (e.response?.data?.error ?? 'Falha ao carregar configurações.') : 'Erro inesperado.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(input: SaveSettingsInput): Promise<boolean> {
    loading.value = true
    error.value   = null

    try {
      const { data } = await axios.put<SettingsMap>('/api/settings', input)
      settings.value = data
      return true
    } catch (e: unknown) {
      error.value = axios.isAxiosError(e) ? (e.response?.data?.error ?? 'Falha ao salvar configurações.') : 'Erro inesperado.'
      return false
    } finally {
      loading.value = false
    }
  }

  return { settings, loading, error, fetchSettings, saveSettings }
}
