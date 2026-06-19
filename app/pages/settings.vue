<script setup lang="ts">
import { PhArrowLeft, PhEye, PhEyeSlash } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { FontSize } from '@/composables/useSettings'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Pengaturan' })

const { storeName, fontSize, saveStoreName, saveFontSize } = useSettings()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const storeNameDraft = ref(storeName.value)
const savingName = ref(false)

watch(storeName, (v) => {
  storeNameDraft.value = v
})

const isAdmin = computed(() => (user.value?.app_metadata as any)?.role === 'admin')

async function handleSaveStoreName() {
  const name = storeNameDraft.value.trim() || 'Toko Arijaya'
  savingName.value = true
  const { error } = await saveStoreName(name)
  savingName.value = false
  if (error) {
    toast.error('Gagal menyimpan nama toko')
  } else {
    toast.success('Nama toko diperbarui')
  }
}

async function onFontSizeChange(val: unknown) {
  if (!val || typeof val !== 'string') return
  const { error } = await saveFontSize(val as FontSize)
  if (error) toast.error('Gagal menyimpan ukuran teks')
}

const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const changingPassword = ref(false)

async function changePassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Password tidak cocok')
    return
  }
  changingPassword.value = true
  const { error } = await supabase.auth.updateUser({ password: newPassword.value })
  changingPassword.value = false
  if (error) {
    toast.error('Gagal mengubah password')
  } else {
    toast.success('Password berhasil diubah')
    newPassword.value = ''
    confirmPassword.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3">
      <NuxtLink to="/">
        <Button variant="ghost" class="h-12 text-lg gap-2">
          <PhArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </NuxtLink>
      <h1 class="text-2xl lg:text-3xl font-bold">Pengaturan</h1>
    </header>

    <main class="p-4 lg:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Nama Toko</CardTitle>
          <CardDescription class="text-base">
            Ditampilkan di judul halaman dan struk belanja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form class="flex flex-col gap-3" @submit.prevent="handleSaveStoreName">
            <Input
              v-model="storeNameDraft"
              class="h-12 text-lg"
              required
              maxlength="60"
              placeholder="Nama toko"
              :disabled="!isAdmin"
            />
            <Button type="submit" class="h-12 text-lg" :disabled="savingName || !isAdmin">
              <Spinner v-if="savingName" data-icon="inline-start" />
              {{ savingName ? 'Menyimpan...' : 'Simpan Nama Toko' }}
            </Button>
            <p v-if="!isAdmin" class="text-base text-muted-foreground">
              Hanya admin yang dapat mengubah nama toko.
            </p>
          </form>
        </CardContent>
      </Card>

      <!-- Ukuran Teks -->
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Ukuran Teks</CardTitle>
          <CardDescription class="text-base">
            Mengatur ukuran teks di seluruh aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            variant="outline"
            :model-value="fontSize"
            class="w-full"
            @update:model-value="onFontSizeChange"
          >
            <ToggleGroupItem value="kecil" class="flex-1 h-12 text-lg">
              Kecil
            </ToggleGroupItem>
            <ToggleGroupItem value="sedang" class="flex-1 h-12 text-lg">
              Sedang
            </ToggleGroupItem>
            <ToggleGroupItem value="besar" class="flex-1 h-12 text-lg">
              Besar
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <!-- Akun Pengguna -->
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Akun Pengguna</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-5">
          <div class="flex flex-col gap-1">
            <Label class="text-lg">Email</Label>
            <p class="text-lg text-muted-foreground py-2">{{ user?.email }}</p>
          </div>

          <Separator />

          <p class="text-lg font-medium">Ganti Password</p>

          <form class="flex flex-col gap-4" @submit.prevent="changePassword">
            <Field>
              <FieldLabel class="text-lg">Password Baru</FieldLabel>
              <div class="relative">
                <Input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="h-12 text-lg pr-14"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  placeholder="Min. 8 karakter"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
                  :aria-label="showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showNewPassword = !showNewPassword"
                >
                  <PhEyeSlash v-if="showNewPassword" class="size-6" />
                  <PhEye v-else class="size-6" />
                </button>
              </div>
            </Field>

            <Field>
              <FieldLabel class="text-lg">Konfirmasi Password</FieldLabel>
              <div class="relative">
                <Input
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="h-12 text-lg pr-14"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
                  :aria-label="showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <PhEyeSlash v-if="showConfirmPassword" class="size-6" />
                  <PhEye v-else class="size-6" />
                </button>
              </div>
            </Field>

            <Button type="submit" class="h-12 text-lg" :disabled="changingPassword">
              <Spinner v-if="changingPassword" data-icon="inline-start" />
              {{ changingPassword ? 'Menyimpan...' : 'Ubah Password' }}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  </div>
</template>
