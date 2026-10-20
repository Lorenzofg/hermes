<template>
  <div
    v-if="busy"
    class="flex items-center gap-3 border border-zinc-700 bg-zinc-800 rounded-lg px-5 py-4 text-sm text-zinc-300"
    role="status"
  >
    <span class="w-4 h-4 shrink-0 border-2 border-zinc-500 border-t-white rounded-full animate-spin" aria-hidden="true" />
    {{ busy }}
  </div>
  <div
    v-else-if="notice"
    class="flex items-start justify-between gap-3 border border-emerald-700 bg-emerald-900/30 rounded-lg px-5 py-4 text-sm text-emerald-300"
    role="status"
  >
    <span>{{ notice }}</span>
    <button class="text-emerald-400 hover:text-emerald-200 transition-colors" aria-label="Fechar" @click="$emit('close')">✕</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ busy: string | null; notice: string | null }>()
defineEmits<{ (e: 'close'): void }>()
</script>
