<template>
  <div v-if="visibleProviders.length > 1" class="space-y-1.5">
    <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Provedor de IA</label>
    <div class="flex rounded-lg border border-zinc-700 overflow-hidden">
      <button
        v-for="p in visibleProviders"
        :key="p.value"
        class="px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors"
        :class="modelValue === p.value
          ? 'bg-zinc-600 text-zinc-100'
          : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
        @click="$emit('update:modelValue', p.value)"
      >
        {{ p.label }}
      </button>
    </div>
  </div>
  <div v-else-if="visibleProviders.length === 1" class="space-y-1.5">
    <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Provedor de IA</label>
    <p class="text-sm text-zinc-300">{{ visibleProviders[0].label }}</p>
  </div>
  <p v-else-if="providers" class="text-xs text-amber-400">
    Nenhum provedor configurado —
    <RouterLink to="/settings" class="underline underline-offset-2 hover:text-amber-300">configure um em Configurações</RouterLink>.
  </p>
  <div v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { AIProvider } from '@hermes/types'

const props = defineProps<{
  providers: Record<AIProvider, boolean> | null
  modelValue: AIProvider
}>()

defineEmits<{ (e: 'update:modelValue', value: AIProvider): void }>()

const allProviders = [
  { value: 'claude' as const, label: 'Claude' },
  { value: 'gpt'    as const, label: 'GPT' },
  { value: 'gemini' as const, label: 'Gemini' },
]

const visibleProviders = computed(() =>
  props.providers ? allProviders.filter((p) => props.providers![p.value]) : [],
)
</script>
