<script setup lang="ts">
import { PhPlus, PhPencil, PhTrash, PhArrowLeft } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { Product, ProductInput } from '@/composables/useProducts'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Inventaris — Toko Arijaya' })

const { fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts()
const { formatIDR } = useCurrency()

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

function stockBadgeVariant(stock: number) {
  if (stock === 0) return 'destructive'
  if (stock <= 5) return 'secondary'
  return 'outline'
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
      <div v-if="loading" class="flex flex-col gap-3">
        <Skeleton v-for="i in 5" :key="i" class="h-20 w-full rounded-lg" />
      </div>

      <Empty v-else-if="products.length === 0">
        <EmptyHeader>
          <EmptyTitle class="text-2xl">Belum ada produk</EmptyTitle>
          <EmptyDescription class="text-lg">Tambahkan produk pertama Anda</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <template v-else>
        <!-- Mobile Card List -->
        <div class="flex flex-col gap-3 lg:hidden">
          <div
            v-for="p in products"
            :key="p.id"
            class="rounded-lg border bg-card p-4 flex flex-col gap-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-lg font-semibold leading-tight">{{ p.name }}</p>
                <p class="text-base text-foreground/70 mt-1">
                  {{ p.category || 'Tanpa kategori' }} · {{ p.unit }}
                </p>
                <p class="text-xl font-bold text-primary mt-1">{{ formatIDR(p.price) }}</p>
              </div>
              <Badge :variant="stockBadgeVariant(p.stock)" class="text-base px-3 py-1 shrink-0">
                Stok: {{ p.stock }}
              </Badge>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" class="flex-1 h-12 text-base gap-2" @click="openEdit(p)">
                <PhPencil class="size-4" />
                Edit
              </Button>
              <Button variant="destructive" class="flex-1 h-12 text-base gap-2" @click="deletingId = p.id">
                <PhTrash class="size-4" />
                Hapus
              </Button>
            </div>
          </div>
        </div>

        <!-- Desktop Table -->
        <div class="hidden lg:block rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="text-lg font-semibold">Nama</TableHead>
                <TableHead class="text-lg font-semibold">Kategori</TableHead>
                <TableHead class="text-lg font-semibold">Satuan</TableHead>
                <TableHead class="text-lg font-semibold">Harga</TableHead>
                <TableHead class="text-lg font-semibold">Stok</TableHead>
                <TableHead class="text-lg font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="p in products" :key="p.id">
                <TableCell class="text-lg font-medium">{{ p.name }}</TableCell>
                <TableCell class="text-lg text-foreground/70">{{ p.category || '-' }}</TableCell>
                <TableCell class="text-lg">{{ p.unit }}</TableCell>
                <TableCell class="text-lg">{{ formatIDR(p.price) }}</TableCell>
                <TableCell>
                  <Badge :variant="stockBadgeVariant(p.stock)" class="text-base px-3 py-1">
                    {{ p.stock }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" class="h-12 text-base" @click="openEdit(p)">
                      <PhPencil data-icon="inline-start" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" class="h-12 text-base" @click="deletingId = p.id">
                      <PhTrash data-icon="inline-start" />
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>
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
