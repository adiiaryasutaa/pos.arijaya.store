<script setup lang="ts">
import { PhPlus, PhArrowLeft, PhUsers, PhMagnifyingGlass, PhArrowsClockwise, PhX, PhUserPlus, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { AppUser, UserInput } from '@/composables/useUsers'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'Pengguna' })

const { fetchUsers, createUser, updateUser, deleteUser } = useUsers()

const users = ref<AppUser[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingUser = ref<AppUser | null>(null)
const deletingUser = ref<AppUser | null>(null)
const saving = ref(false)

// --- Search filter (client-side; the list is small and fully loaded) ---
const search = ref('')

// URL sync: hydrate from query on load, mirror changes back (replace, no history spam).
const route = useRoute()
const router = useRouter()
search.value = (Array.isArray(route.query.q) ? route.query.q[0] : route.query.q) ?? ''

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return users.value
  return users.value.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  )
})
const hasActiveFilters = computed(() => search.value.trim() !== '')

function resetFilter() {
  search.value = ''
}

watch(search, () => {
  router.replace({ query: search.value.trim() ? { q: search.value.trim() } : {} })
})

async function load() {
  loading.value = true
  try {
    users.value = await fetchUsers()
  } catch {
    toast.error('Gagal memuat pengguna')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openAdd() {
  editingUser.value = null
  showForm.value = true
}

function openEdit(u: AppUser) {
  editingUser.value = u
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingUser.value = null
}

async function handleSubmit(data: UserInput) {
  saving.value = true
  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, data)
      toast.success('Pengguna berhasil diperbarui')
    } else {
      await createUser(data)
      toast.success('Pengguna berhasil ditambahkan')
    }
    closeForm()
    await load()
  } catch (e) {
    toast.error(getErrorMessage(e, 'Gagal menyimpan pengguna'))
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingUser.value) return
  try {
    await deleteUser(deletingUser.value.id)
    toast.success('Pengguna berhasil dihapus')
    deletingUser.value = null
    await load()
  } catch (e) {
    toast.error(getErrorMessage(e, 'Gagal menghapus pengguna'))
  }
}

function confirmDelete(u: AppUser) {
  deletingUser.value = u
}

// Surface the server's statusMessage (e.g. "Email sudah terdaftar", self-protection messages).
function getErrorMessage(e: unknown, fallback: string): string {
  const data = (e as { data?: { statusMessage?: string; message?: string } })?.data
  return data?.statusMessage || data?.message || fallback
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div class="container mx-auto px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3">
        <h1 class="text-2xl lg:text-3xl font-bold flex-1">Pengguna</h1>
        <Button class="h-12 text-lg gap-2" @click="openAdd">
          <PhPlus data-icon="inline-start" />
          <span class="hidden sm:inline">Tambah Pengguna</span>
          <span class="sm:hidden">Tambah</span>
        </Button>
      </div>
    </header>

    <main class="p-4 lg:p-6 container mx-auto">
      <NuxtLink to="/" class="inline-flex mb-4">
        <Button variant="ghost" class="h-12 text-lg gap-2">
          <PhArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </NuxtLink>
      <!-- Filter bar (hidden only when there are no users at all) -->
      <div v-if="loading || users.length" class="flex flex-wrap gap-3 mb-4">
        <div class="relative max-w-xs flex-1">
          <PhMagnifyingGlass class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            v-model="search"
            placeholder="Cari nama atau email..."
            class="h-11 text-base pl-11"
          />
        </div>

        <Button
          variant="outline"
          class="h-11 text-base gap-2 ml-auto"
          :disabled="!hasActiveFilters"
          @click="resetFilter"
        >
          <PhX data-icon="inline-start" />
          <span class="hidden sm:inline">Reset Filter</span>
        </Button>

        <Button
          variant="outline"
          class="h-11 w-11"
          :disabled="loading"
          aria-label="Muat ulang"
          @click="load"
        >
          <PhArrowsClockwise class="size-5" :class="loading ? 'animate-spin' : ''" />
        </Button>
      </div>

      <Empty v-if="!loading && users.length === 0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PhUsers class="size-6" />
          </EmptyMedia>
          <EmptyTitle class="text-2xl">Belum ada pengguna</EmptyTitle>
          <EmptyDescription class="text-lg">Tambahkan pengguna pertama Anda</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button class="h-12 text-lg gap-2" @click="openAdd">
            <PhPlus data-icon="inline-start" />
            Tambah Pengguna
          </Button>
        </EmptyContent>
      </Empty>

      <UserTable
        v-else
        :users="filteredUsers"
        :loading="loading"
        @edit="openEdit"
        @delete="confirmDelete"
      />
    </main>

    <!-- Add/Edit Dialog -->
    <Dialog :open="showForm" @update:open="(v) => !v && closeForm()">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1">
            <component :is="editingUser ? PhPencilSimple : PhUserPlus" class="size-6" />
          </div>
          <DialogTitle class="text-2xl">
            {{ editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru' }}
          </DialogTitle>
          <DialogDescription class="text-base">
            {{ editingUser ? 'Ubah data pengguna di bawah ini.' : 'Isi data pengguna baru.' }}
          </DialogDescription>
        </DialogHeader>
        <UserForm :user="editingUser" @submit="handleSubmit" @cancel="closeForm" />
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog :open="!!deletingUser" @update:open="(v) => !v && (deletingUser = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia class="bg-destructive/10 text-destructive">
            <PhTrash />
          </AlertDialogMedia>
          <AlertDialogTitle class="text-2xl">Hapus Pengguna?</AlertDialogTitle>
          <AlertDialogDescription class="text-lg">
            Akun
            <span class="font-medium">{{ deletingUser?.email }}</span>
            akan dihapus permanen dan tidak bisa dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="h-12 text-lg">Batal</AlertDialogCancel>
          <AlertDialogAction class="h-12 text-lg" @click="handleDelete">Ya, Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
