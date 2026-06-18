<script setup lang="ts">
import { PhWarningCircle, PhHouse } from '@phosphor-icons/vue'
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

// Send the user back to a known-good screen; clearError unmounts this page.
function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md text-center">
      <CardHeader class="flex flex-col items-center gap-3 pt-8">
        <PhWarningCircle class="size-16 text-destructive" />
        <CardTitle class="text-3xl">Maaf, terjadi kesalahan</CardTitle>
        <CardDescription class="text-lg">
          {{ error.statusCode === 404
            ? 'Halaman yang Anda cari tidak ditemukan.'
            : 'Aplikasi mengalami gangguan. Silakan coba kembali ke beranda.' }}
        </CardDescription>
      </CardHeader>
      <CardContent class="pb-8">
        <Button class="h-16 text-xl w-full gap-2" @click="goHome">
          <PhHouse class="size-6" />
          Kembali ke Beranda
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
