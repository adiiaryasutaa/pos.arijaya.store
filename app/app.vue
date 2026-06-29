<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'

const settings = useSettingsStore()
const { storeName, fontSize } = storeToRefs(settings)

// Client-only + non-blocking: settings have sane defaults, so don't stall SSR
// on the remote Supabase round-trip (cold start can take several seconds).
useLazyAsyncData('settings', () => settings.loadSettings(), { server: false })

useHead({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} — ${storeName.value}` : storeName.value,
})

onMounted(() => {
  watchEffect(() => {
    const html = document.documentElement
    html.classList.remove('font-kecil', 'font-sedang', 'font-besar')
    html.classList.add(`font-${fontSize.value}`)
  })
})
</script>

<template>
  <NuxtPage />
  <Toaster rich-colors position="top-center" :duration="3000" />
</template>
