<template>
  <!-- Floating assistant: it never writes to the database. It edits the same
       working copy the table shows; saving stays an explicit action. -->
  <button
    v-if="!open"
    class="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-white text-zinc-900 shadow-xl ring-1 ring-black/10 flex items-center justify-center hover:scale-105 hover:bg-zinc-100 active:scale-95 transition-transform"
    aria-label="Abrir o assistente"
    title="Assistente"
    @click="open = true"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  </button>

  <aside
    v-else
    class="fixed bottom-4 right-4 z-20 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl flex flex-col"
  >
    <header class="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
      <div>
        <p class="text-xs font-semibold tracking-widest uppercase text-zinc-300">Assistente</p>
        <p class="text-[11px] text-zinc-500">Ajustar, acrescentar período, voltar versão</p>
      </div>
      <button class="text-xs text-zinc-400 hover:text-zinc-200" @click="open = false">Fechar</button>
    </header>

    <div ref="scroller" class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="max-w-[90%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap break-words"
        :class="m.role === 'user'
          ? 'ml-auto bg-white text-zinc-900'
          : 'bg-zinc-700 text-zinc-100'"
      >
        {{ m.content }}
      </div>

      <p v-if="sending" class="text-xs text-zinc-500">Pensando...</p>
      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
    </div>

    <footer class="border-t border-zinc-700 p-3 space-y-2">
      <div v-if="undoSnapshot" class="flex items-center justify-between text-[11px] text-zinc-400">
        <span>Alterações do chat não salvas.</span>
        <button class="underline underline-offset-2 hover:text-zinc-200" @click="undo">Desfazer</button>
      </div>
      <div class="flex items-end gap-2">
        <textarea
          v-model="input"
          rows="2"
          placeholder="Ex.: aplica essa determinação a partir de 01/03/2025..."
          class="flex-1 resize-none bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-500"
          @keydown.enter.exact.prevent="send"
        />
        <button
          :disabled="!input.trim() || sending"
          class="px-3 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap"
          :class="input.trim() && !sending
            ? 'bg-white text-zinc-900 hover:bg-zinc-100'
            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
          @click="send"
        >
          Enviar
        </button>
      </div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import axios from 'axios'
import type { ChatMessage, ChatResponse, DayEntry, AIProvider } from '@hermes/types'

const props = defineProps<{
  days: DayEntry[]
  warnings: string[]
  provider: AIProvider
  analysisId?: number
}>()

const emit = defineEmits<{
  (e: 'update:days', days: DayEntry[]): void
  (e: 'update:warnings', warnings: string[]): void
}>()

const open = ref(false)
const input = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const scroller = ref<HTMLElement | null>(null)
const undoSnapshot = ref<{ days: DayEntry[]; warnings: string[] } | null>(null)

const messages = ref<ChatMessage[]>([
  {
    role: 'assistant',
    content: 'Oi. Cole a determinação e diga o que fazer com ela — ajustar os dias, acrescentar um período, presumir meses ou voltar a uma versão. Eu mostro o resultado na tabela antes de salvar.',
  },
])

const OP_LABEL: Record<string, string> = {
  adjust: 'Ajuste',
  'add-period': 'Período',
  'presume-missing': 'Presunção',
  'set-day': 'Dia',
  'restore-version': 'Versão',
}

async function scrollToEnd() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  error.value = null
  sending.value = true
  await scrollToEnd()

  const snapshot = {
    days: JSON.parse(JSON.stringify(props.days)) as DayEntry[],
    warnings: [...props.warnings],
  }

  try {
    const { data } = await axios.post<ChatResponse>('/api/timesheet/chat', {
      days: props.days,
      warnings: props.warnings,
      messages: messages.value.slice(-12),
      analysisId: props.analysisId,
      provider: props.provider,
    })

    const lines = [data.reply]
    for (const change of data.changes) {
      lines.push(`${change.ok ? '✓' : '!'} ${OP_LABEL[change.op] ?? change.op}: ${change.summary}`)
    }
    messages.value.push({ role: 'assistant', content: lines.join('\n') })

    if (data.changes.some((c) => c.ok)) {
      undoSnapshot.value = snapshot
      emit('update:days', data.days)
      emit('update:warnings', data.warnings)
    }
  } catch (e) {
    error.value = axios.isAxiosError(e)
      ? (e.response?.data?.error ?? 'Falha na conversa.')
      : 'Erro inesperado.'
  } finally {
    sending.value = false
    await scrollToEnd()
  }
}

function undo() {
  if (!undoSnapshot.value) return
  emit('update:days', undoSnapshot.value.days)
  emit('update:warnings', undoSnapshot.value.warnings)
  undoSnapshot.value = null
  messages.value.push({ role: 'assistant', content: 'Alterações do chat desfeitas.' })
  scrollToEnd()
}
</script>
