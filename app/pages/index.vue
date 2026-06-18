<script setup lang="ts">
import {
  PhShoppingCart,
  PhPackage,
  PhClipboardText,
  PhSignOut,
} from '@phosphor-icons/vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Toko Arijaya' })

const supabase = useSupabaseClient()
const showLogoutConfirm = ref(false)

async function logout() {
  showLogoutConfirm.value = false
  await supabase.auth.signOut()
  await navigateTo('/login')
}

const menus = [
  {
    label: 'Kasir',
    description: 'Proses penjualan dan pembayaran',
    icon: PhShoppingCart,
    to: '/cashier',
  },
  {
    label: 'Inventaris',
    description: 'Kelola stok dan daftar produk',
    icon: PhPackage,
    to: '/inventory',
  },
  {
    label: 'Riwayat Transaksi',
    description: 'Lihat dan cetak bukti transaksi',
    icon: PhClipboardText,
    to: '/transactions',
  },
]
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b px-4 py-3 lg:px-6 lg:py-4 flex items-center justify-between">
      <h1 class="text-2xl lg:text-3xl font-bold">Toko Arijaya</h1>
      <Button variant="outline" class="h-12 text-lg gap-2" @click="showLogoutConfirm = true">
        <PhSignOut data-icon="inline-start" />
        <span class="hidden sm:inline">Keluar</span>
      </Button>
    </header>

    <AlertDialog :open="showLogoutConfirm" @update:open="(v) => (showLogoutConfirm = v)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle class="text-2xl">Keluar dari aplikasi?</AlertDialogTitle>
          <AlertDialogDescription class="text-lg">
            Anda perlu masuk kembali dengan email dan password untuk menggunakan aplikasi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="h-12 text-lg">Batal</AlertDialogCancel>
          <AlertDialogAction class="h-12 text-lg" @click="logout">Ya, Keluar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <main class="p-4 lg:p-6 max-w-2xl mx-auto">
      <p class="text-lg lg:text-xl text-muted-foreground mb-4 lg:mb-6">Selamat datang. Pilih menu di bawah ini:</p>
      <div class="flex flex-col gap-3 lg:gap-4">
        <NuxtLink v-for="menu in menus" :key="menu.to" :to="menu.to">
          <Card class="cursor-pointer hover:bg-accent transition-colors active:scale-[0.99]">
            <CardHeader class="p-4 lg:p-6">
              <div class="flex items-center gap-4">
                <component :is="menu.icon" class="size-10 lg:size-12 text-primary shrink-0" />
                <div>
                  <CardTitle class="text-xl lg:text-2xl">{{ menu.label }}</CardTitle>
                  <CardDescription class="text-base lg:text-lg mt-1">{{ menu.description }}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>
