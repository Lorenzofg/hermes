<template>
  <div v-if="loading && progress" class="space-y-1.5">
    <p class="text-xs text-zinc-400">
      Processing page {{ progress.current }} of {{ progress.total }}...
    </p>
    <div class="w-full bg-zinc-700 rounded-full h-1.5">
      <div
        class="bg-white h-1.5 rounded-full transition-all"
        :style="{ width: `${(progress.current / progress.total) * 100}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean
  progress: { current: number; total: number } | null
}>()
</script>
