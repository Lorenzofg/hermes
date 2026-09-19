import { ref, onMounted } from 'vue'
import axios from 'axios'

export function useProviders() {
  const providers = ref<{ claude: boolean; gpt: boolean; gemini: boolean } | null>(null)

  onMounted(async () => {
    try {
      const { data } = await axios.get<{ claude: boolean; gpt: boolean; gemini: boolean }>('/api/providers')
      providers.value = data
    } catch {
      providers.value = { claude: true, gpt: true, gemini: true }
    }
  })

  return { providers }
}
