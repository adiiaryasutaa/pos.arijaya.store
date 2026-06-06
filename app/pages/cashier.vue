<script setup lang="ts">
import {
  PhArrowLeft,
  PhMagnifyingGlass,
  PhMinus,
  PhPlus,
  PhTrash,
  PhShoppingCart,
} from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { Transaction } from '@/composables/useTransactions'

definePageMeta({ middleware: 'auth' })

const { fetchProducts } = useProducts()
const { createTransaction } = useTransactions()
const { formatIDR } = useCurrency()
const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount } = useCart()
const user = useSupabaseUser()

const products = ref<Awaited<ReturnType<typeof fetchProducts>>>([])
const search = ref('')
const paymentMethod = ref<'cash' | 'transfer'>('cash')
const processing = ref(false)
const invoiceTransaction = ref<Transaction | null>(null)
const showInvoice = ref(false)

const filteredProducts = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return products.value
  return products.value.filter(p => p.name.toLowerCase().includes(q))
})

onMounted(async () => {
  try {
    products.value = await fetchProducts()
  } catch {
    toast.error('Gagal memuat produk')
  }
})

async function processTransaction() {
  if (items.value.length === 0) return
  if (!user.value) {
    toast.error('Sesi berakhir, silakan login ulang')
    return navigateTo('/login')
  }
  processing.value = true
  try {
    const soldItems = [...items.value]
    const tx = await createTransaction(soldItems, paymentMethod.value)
    invoiceTransaction.value = tx
    showInvoice.value = true
    clearCart()
    // Patch local stock — avoid full re-fetch
    for (const sold of soldItems) {
      const p = products.value.find(p => p.id === sold.product.id)
      if (p) p.stock -= sold.quantity
    }
    toast.success('Transaksi berhasil!')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi'
    toast.error(msg)
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <header class="border-b px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink to="/">
        <Button variant="ghost" class="h-12 text-lg gap-2">
          <PhArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </NuxtLink>
      <h1 class="text-3xl font-bold">Kasir</h1>
    </header>

    <div class="flex flex-1 overflow-hidden flex-col lg:flex-row">
      <!-- Product Grid -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="p-4 border-b">
          <div class="relative">
            <PhMagnifyingGlass class="absolute left-4 top-1/2 -translate-y-1/2 size-6 text-muted-foreground" />
            <Input
              v-model="search"
              class="h-12 text-lg pl-12"
              placeholder="Cari produk..."
            />
          </div>
        </div>

        <ScrollArea class="flex-1 p-4">
          <div
            v-if="filteredProducts.length === 0"
            class="flex items-center justify-center h-48 text-xl text-muted-foreground"
          >
            Produk tidak ditemukan
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
            <button
              v-for="p in filteredProducts"
              :key="p.id"
              :disabled="p.stock === 0"
              class="text-left rounded-lg border bg-card p-4 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              @click="addItem(p)"
            >
              <p class="text-lg font-semibold leading-tight">{{ p.name }}</p>
              <p class="text-base text-muted-foreground mt-1">{{ p.unit }}</p>
              <p class="text-xl font-bold text-primary mt-2">{{ formatIDR(p.price) }}</p>
              <Badge
                :variant="p.stock === 0 ? 'destructive' : p.stock <= 5 ? 'secondary' : 'outline'"
                class="mt-2 text-sm"
              >
                Stok: {{ p.stock }}
              </Badge>
            </button>
          </div>
        </ScrollArea>
      </div>

      <!-- Cart -->
      <div class="lg:w-96 border-t lg:border-t-0 lg:border-l flex flex-col bg-card">
        <div class="p-4 border-b flex items-center gap-3">
          <PhShoppingCart class="size-7" />
          <span class="text-xl font-bold">Keranjang</span>
          <Badge v-if="itemCount > 0" class="ml-auto text-base px-3">{{ itemCount }} item</Badge>
        </div>

        <ScrollArea class="flex-1 p-4">
          <div v-if="items.length === 0" class="flex flex-col items-center justify-center gap-2 h-32 text-muted-foreground">
            <PhShoppingCart class="size-10" />
            <p class="text-lg">Keranjang kosong</p>
          </div>

          <div v-else class="flex flex-col gap-3">
            <div
              v-for="item in items"
              :key="item.product.id"
              class="flex flex-col gap-2 p-3 rounded-lg border bg-background"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-lg font-medium leading-tight">{{ item.product.name }}</p>
                <button
                  class="text-destructive hover:opacity-70 transition-opacity shrink-0 p-1"
                  @click="removeItem(item.product.id)"
                >
                  <PhTrash class="size-5" />
                </button>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-base text-muted-foreground">{{ formatIDR(item.product.price) }}</p>
                <div class="flex items-center gap-2">
                  <button
                    class="size-10 rounded-md border flex items-center justify-center hover:bg-accent transition-colors"
                    @click="updateQuantity(item.product.id, item.quantity - 1)"
                  >
                    <PhMinus class="size-5" />
                  </button>
                  <span class="w-8 text-center text-xl font-bold">{{ item.quantity }}</span>
                  <button
                    class="size-10 rounded-md border flex items-center justify-center hover:bg-accent transition-colors"
                    :disabled="item.quantity >= item.product.stock"
                    @click="updateQuantity(item.product.id, item.quantity + 1)"
                  >
                    <PhPlus class="size-5" />
                  </button>
                </div>
              </div>
              <p class="text-right text-lg font-semibold">
                {{ formatIDR(item.product.price * item.quantity) }}
              </p>
            </div>
          </div>
        </ScrollArea>

        <!-- Cart Footer -->
        <div class="p-4 border-t flex flex-col gap-4">
          <Separator />
          <div class="flex justify-between items-center">
            <span class="text-xl font-bold">Total</span>
            <span class="text-2xl font-bold text-primary">{{ formatIDR(total) }}</span>
          </div>

          <!-- Payment Method -->
          <div class="flex flex-col gap-2">
            <p class="text-lg font-medium">Metode Pembayaran</p>
            <ToggleGroup
              v-model="paymentMethod"
              type="single"
              class="grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem value="cash" class="h-12 text-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Tunai
              </ToggleGroupItem>
              <ToggleGroupItem value="transfer" class="h-12 text-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Transfer
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Button
            class="h-16 text-xl w-full"
            :disabled="items.length === 0 || processing"
            @click="processTransaction"
          >
            <Spinner v-if="processing" data-icon="inline-start" />
            {{ processing ? 'Memproses...' : 'Proses Transaksi' }}
          </Button>
        </div>
      </div>
    </div>

    <InvoiceModal
      v-model:open="showInvoice"
      :transaction="invoiceTransaction"
    />
  </div>
</template>
