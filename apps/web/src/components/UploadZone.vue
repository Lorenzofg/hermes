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
      :multiple="multiple"
      @change="onSelect"
    />

    <div v-if="multiple && files?.length" class="space-y-3" @click.stop>
      <ul class="space-y-1.5 text-left max-w-md mx-auto">
        <li v-for="(f, i) in files" :key="i" class="flex items-center justify-between gap-3">
          <span class="text-sm text-zinc-100 truncate">{{ f.name }}</span>
          <span class="flex items-center gap-3 shrink-0">
            <span class="text-xs text-zinc-400">{{ formatSize(f.size) }}</span>
            <button class="text-xs text-zinc-400 hover:text-red-400 transition-colors underline underline-offset-2" @click="removeAt(i)">
              Remover
            </button>
          </span>
        </li>
      </ul>
      <button class="text-xs text-zinc-300 hover:text-zinc-100 underline underline-offset-2" @click="inputRef?.click()">
        Adicionar mais arquivos
      </button>
    </div>

    <div v-else-if="!selectedFile || multiple" class="space-y-2">
      <p class="text-sm text-zinc-300">{{ multiple ? 'Solte os arquivos aqui ou clique para selecionar' : 'Solte o arquivo aqui ou clique para selecionar' }}</p>
      <p class="text-xs text-zinc-500">{{ multiple ? 'JPG, PNG, WEBP ou PDF — vários PDFs são juntados em um só' : 'JPG, PNG, WEBP ou PDF' }}</p>
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

// multiple mode is controlled (v-model:files) so a parent reset clears the list
const props = defineProps<{ multiple?: boolean; files?: File[] }>()

const emit = defineEmits<{
  (e: 'update:file', file: File | null): void
  (e: 'update:files', files: File[]): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const selectedFile = ref<File | null>(null)

function onSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.multiple) addFiles(Array.from(input.files ?? []))
  else if (input.files?.[0]) setFile(input.files[0])
  input.value = '' // lets the same file be picked again after removing it
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const dropped = Array.from(event.dataTransfer?.files ?? [])
  if (inputRef.value?.multiple) addFiles(dropped)
  else if (dropped[0]) setFile(dropped[0])
}

function addFiles(files: File[]) {
  if (!files.length) return
  emit('update:files', [...(props.files ?? []), ...files])
}

function removeAt(i: number) {
  emit('update:files', (props.files ?? []).filter((_, j) => j !== i))
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
