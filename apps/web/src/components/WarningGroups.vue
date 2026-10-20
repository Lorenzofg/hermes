<template>
  <div class="space-y-3">
    <div v-for="g in groups" :key="g.category">
      <p class="font-semibold text-amber-200" :class="small ? 'text-xs' : 'text-sm'">
        {{ g.category }} ({{ g.items.length }})
      </p>
      <ul class="space-y-0.5 mt-1">
        <li v-for="(w, i) in g.items" :key="i" class="text-amber-300" :class="small ? 'text-xs' : 'text-sm'">— {{ w }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { groupWarnings } from '../lib/warnings'

const props = defineProps<{ warnings: string[]; small?: boolean }>()
const groups = computed(() => groupWarnings(props.warnings))
</script>
