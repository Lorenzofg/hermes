<template>
  <div class="space-y-1.5">
    <label class="text-xs font-medium tracking-wide uppercase text-zinc-500">Pages (optional)</label>
    <div class="flex items-center gap-1.5">
      <input
        type="number"
        min="1"
        placeholder="1"
        :value="from"
        class="w-14 bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
        @input="$emit('update:from', toNum($event))"
      />
      <span class="text-zinc-600 text-xs">–</span>
      <input
        type="number"
        min="1"
        placeholder="end"
        :value="to"
        class="w-14 bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-600"
        @input="$emit('update:to', toNum($event))"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ from: number | null; to: number | null }>()
defineEmits<{
  (e: 'update:from', value: number | null): void
  (e: 'update:to', value: number | null): void
}>()

function toNum(e: Event): number | null {
  const v = (e.target as HTMLInputElement).value
  return v === '' ? null : Number(v)
}
</script>
