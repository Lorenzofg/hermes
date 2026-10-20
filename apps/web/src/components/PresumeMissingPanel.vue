<template>
  <section class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
    <p class="text-xs text-zinc-500">
      Para os meses que a reclamada não juntou, cole o trecho da decisão com a jornada presumida. Os dias desses meses são gerados com essa jornada; dias já existentes na tabela não são alterados.
    </p>

    <div v-if="months.length" class="space-y-1.5">
      <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Meses faltantes</label>
      <div class="flex flex-wrap gap-x-4 gap-y-2">
        <label v-for="m in months" :key="m" class="flex items-center gap-1.5 text-sm text-zinc-200 font-mono">
          <input v-model="selected" type="checkbox" :value="m" class="accent-white" />
          {{ m }}
        </label>
      </div>
    </div>
    <p v-else class="text-sm text-zinc-400">Nenhum mês faltante restante.</p>

    <textarea
      v-model="text"
      rows="4"
      placeholder="Cole aqui o trecho da decisão com a jornada presumida..."
      class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-500"
    />

    <div class="flex items-center justify-between gap-2 flex-wrap">
      <ProviderPicker :model-value="provider" :providers="providers" @update:model-value="$emit('update:provider', $event)" />
      <div class="flex gap-2">
        <button
          v-if="canUndo"
          class="px-4 py-1.5 text-xs font-semibold border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors whitespace-nowrap"
          @click="$emit('undo')"
        >
          Desfazer
        </button>
        <button
          :disabled="!canApply"
          class="px-4 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap"
          :class="canApply ? 'bg-white text-zinc-900 hover:bg-zinc-100' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
          @click="$emit('apply', selected, text)"
        >
          {{ loading ? 'Presumindo...' : 'Presumir' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ProviderPicker from './ProviderPicker.vue'
import type { AIProvider } from '@hermes/types'

const props = defineProps<{
  months: string[]
  provider: AIProvider
  providers: Record<AIProvider, boolean> | null
  loading: boolean
  canUndo: boolean
}>()

defineEmits<{
  (e: 'apply', months: string[], text: string): void
  (e: 'undo'): void
  (e: 'update:provider', value: AIProvider): void
}>()

const text = ref('')
const selected = ref<string[]>([...props.months])
// all missing months start checked; keep the selection in sync after a fill or undo
watch(() => props.months, (m) => { selected.value = [...m] })

const canApply = computed(() => !props.loading && selected.value.length > 0 && !!text.value.trim())
</script>
