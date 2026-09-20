<template>
  <div class="space-y-6">

    <p class="text-xs text-zinc-500">
      Cut PDF trims a large combined document down to just the pages you want (e.g. one person's cartão de ponto buried in a 200-page file) — download the smaller file, then upload it to Timesheet/Batch/Payslip as usual.
    </p>

    <section class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-6">
      <h2 class="text-xs font-semibold tracking-widest uppercase text-zinc-400">Cut PDF</h2>

      <UploadZone v-model:file="file" />

      <div v-if="file" class="flex items-end justify-between gap-4">
        <PageRangeInput v-model:from="pageFrom" v-model:to="pageTo" />

        <button
          :disabled="!canCut || loading"
          class="px-6 py-2 text-sm font-semibold rounded-lg transition-colors"
          :class="canCut && !loading
            ? 'bg-white text-zinc-900 hover:bg-zinc-100'
            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'"
          @click="handleCut"
        >
          {{ loading ? 'Cutting...' : 'Cut & Download' }}
        </button>
      </div>
    </section>

    <div
      v-if="error"
      class="border border-red-700 bg-red-900/30 rounded-lg px-5 py-4 text-sm text-red-300"
    >
      {{ error }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'
import UploadZone from '../components/UploadZone.vue'
import PageRangeInput from '../components/PageRangeInput.vue'

const file = ref<File | null>(null)
const pageFrom = ref<number | null>(null)
const pageTo = ref<number | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const canCut = computed(() => !!file.value && !!pageFrom.value && !!pageTo.value)

async function handleCut() {
  if (!file.value || !pageFrom.value || !pageTo.value) return

  loading.value = true
  error.value = null

  try {
    const form = new FormData()
    form.append('file', file.value)

    const { data } = await axios.post(`/api/pdf-cut?from=${pageFrom.value}&to=${pageTo.value}`, form, {
      responseType: 'blob',
    })

    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `pages_${pageFrom.value}-${pageTo.value}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
      // Error responses also come back as a blob because of responseType, so
      // the JSON error body needs to be read out of it manually.
      const text = await e.response.data.text()
      error.value = JSON.parse(text)?.error ?? 'Failed to cut PDF.'
    } else {
      error.value = 'Failed to cut PDF.'
    }
  } finally {
    loading.value = false
  }
}
</script>
