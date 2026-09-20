import { ref } from 'vue'

export function useCopyColumn() {
  const copiedColumn = ref<string | null>(null)
  let copiedTimeout: ReturnType<typeof setTimeout> | undefined

  async function copyColumn(key: string, values: string[]) {
    const text = values.join('\n')

    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers/contexts without Clipboard API access
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    copiedColumn.value = key
    clearTimeout(copiedTimeout)
    copiedTimeout = setTimeout(() => { copiedColumn.value = null }, 1500)
  }

  return { copiedColumn, copyColumn }
}
