import { ref, onMounted } from 'vue'
import { useSettings } from './useSettings'

export function useProviders() {
  const providers = ref<{ claude: boolean; gpt: boolean; gemini: boolean } | null>(null)
  const { fetchSettings } = useSettings()

  onMounted(async () => {
    const data = await fetchSettings()
    providers.value = data
      ? { claude: data.claude.configured, gpt: data.gpt.configured, gemini: data.gemini.configured }
      : { claude: false, gpt: false, gemini: false }
  })

  return { providers }
}
