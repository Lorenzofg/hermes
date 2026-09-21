<template>
  <div
    class="border border-dashed rounded-lg px-8 py-12 text-center transition-colors cursor-pointer"
    :class="dragging
      ? 'border-zinc-400 bg-zinc-700/60'
      : 'border-zinc-600 hover:border-zinc-500 hover:bg-zinc-700/30'"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
    @click="inputRef?.click()"
  >
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      @change="onSelect"
    />

    <div v-if="!selectedFile" class="space-y-2">
      <p class="text-sm text-zinc-300">Solte o arquivo aqui ou clique para selecionar</p>
      <p class="text-xs text-zinc-500">JPG, PNG, WEBP ou PDF</p>
    </div>

    <div v-else class="space-y-1" @click.stop>
      <p class="text-sm font-medium text-zinc-100">{{ selectedFile.name }}</p>
      <p class="text-xs text-zinc-400">{{ formatSize(selectedFile.size) }}</p>
      <button
        class="text-xs text-zinc-400 hover:text-red-400 transition-colors mt-2 underline underline-offset-2"
        @click="remove"
      >
        Remover
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'update:file', file: File | null): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const selectedFile = ref<File | null>(null)

function onSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) setFile(input.files[0])
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) setFile(file)
}

function setFile(file: File) {
  selectedFile.value = file
  emit('update:file', file)
}

function remove() {
  selectedFile.value = null
  emit('update:file', null)
  if (inputRef.value) inputRef.value.value = ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>
