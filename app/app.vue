<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'

const { storeName, fontSize, loadSettings } = useSettings()

await useAsyncData('settings', loadSettings)

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
