<template>
  <div class="border rounded-lg" :class="[variant === 'red' ? 'border-red-700 bg-red-900/30' : 'border-amber-700 bg-amber-900/30']">
    <button
      class="w-full flex items-center justify-between px-5 py-4 text-left"
      @click="open = !open"
    >
      <p
        class="text-xs font-semibold tracking-wide uppercase"
        :class="variant === 'red' ? 'text-red-400' : 'text-amber-400'"
      >
        <slot name="title" />
      </p>
      <span class="text-xs" :class="variant === 'red' ? 'text-red-400' : 'text-amber-400'">
        {{ open ? '▲' : '▼' }}
      </span>
    </button>
    <div v-if="open" class="px-5 pb-4 space-y-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{ variant?: 'amber' | 'red'; defaultOpen?: boolean }>(),
  { variant: 'amber', defaultOpen: false },
)

const open = ref(props.defaultOpen)
</script>
