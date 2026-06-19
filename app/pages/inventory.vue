<script setup lang="ts">
import { PhPlus, PhArrowLeft } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { Product, ProductInput } from '@/composables/useProducts'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Inventaris' })

const { fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts()

const products = ref<Product[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingProduct = ref<Product | null>(null)
const deletingId = ref<string | null>(null)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    products.value = await fetchProducts()
  } catch {
    toast.error('Gagal memuat produk')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openAdd() {
  editingProduct.value = null
  showForm.value = true
}

function openEdit(p: Product) {
  editingProduct.value = p
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingProduct.value = null
}

async function handleSubmit(data: ProductInput) {
  saving.value = true
  try {
    if (editingProduct.value) {
      await updateProduct(editingProduct.value.id, data)
      toast.success('Produk berhasil diperbarui')
    } else {
      await createProduct(data)
      toast.success('Produk berhasil ditambahkan')
    }
    closeForm()
    await load()
  } catch {
    toast.error('Gagal menyimpan produk')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingId.value) return
  try {
    await deleteProduct(deletingId.value)
    toast.success('Produk berhasil dihapus')
    deletingId.value = null
    await load()
  } catch {
    toast.error('Gagal menghapus produk')
  }
}

function confirmDelete(p: Product) {
  deletingId.value = p.id
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
      <h1 class="text-2xl lg:text-3xl font-bold flex-1">Inventaris</h1>
      <Button class="h-12 text-lg gap-2" @click="openAdd">
        <PhPlus data-icon="inline-start" />
        <span class="hidden sm:inline">Tambah Produk</span>
        <span class="sm:hidden">Tambah</span>
      </Button>
    </header>

    <main class="p-4 lg:p-6 max-w-5xl mx-auto">
      <Empty v-if="!loading && products.length === 0">
        <EmptyHeader>
          <EmptyTitle class="text-2xl">Belum ada produk</EmptyTitle>
          <EmptyDescription class="text-lg">Tambahkan produk pertama Anda</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <InventoryTable
        v-else
        :products="products"
        :loading="loading"
        @edit="openEdit"
        @delete="confirmDelete"
        @refresh="load"
      />
    </main>

    <!-- Add/Edit Dialog -->
    <Dialog :open="showForm" @update:open="(v) => !v && closeForm()">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle class="text-2xl">
            {{ editingProduct ? 'Edit Produk' : 'Tambah Produk Baru' }}
          </DialogTitle>
          <DialogDescription class="text-base">
            {{ editingProduct ? 'Ubah data produk di bawah ini.' : 'Isi data produk baru.' }}
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          :product="editingProduct"
          @submit="handleSubmit"
          @cancel="closeForm"
        />
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog :open="!!deletingId" @update:open="(v) => !v && (deletingId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle class="text-2xl">Hapus Produk?</AlertDialogTitle>
          <AlertDialogDescription class="text-lg">
            Produk ini akan dihapus secara permanen dan tidak bisa dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="h-12 text-lg">Batal</AlertDialogCancel>
          <AlertDialogAction class="h-12 text-lg" @click="handleDelete">
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
