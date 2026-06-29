<script setup lang="ts">
import {
  PhArrowLeft,
  PhArrowsClockwise,
  PhMagnifyingGlass,
  PhShoppingCart,
  PhTrash,
} from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { Transaction } from '@/composables/useTransactions'
import type { Product } from '@/composables/useProducts'
import type { Database } from '@/types/database.types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Kasir' })

const { fetchProducts } = useProducts()
const { createTransaction } = useTransactions()
const { formatIDR } = useCurrency()
const cart = useCartStore()
const feedback = useFeedback()
const { items, total, itemCount } = storeToRefs(cart)
const { addItem, removeItem, updateQuantity, clearCart, syncWithProducts } = cart
const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()

const products = ref<Product[]>([])
const search = ref('')
const selectedCategory = ref('')
const paymentMethod = ref<'cash' | 'transfer'>('cash')
const amountReceived = ref<number | null>(null)
const processing = ref(false)
const invoiceTransaction = ref<Transaction | null>(null)
const showInvoice = ref(false)
const cartOpen = ref(false)
const refreshing = ref(false)
const showClearConfirm = ref(false)

function handleClearCart() {
  clearCart()
  showClearConfirm.value = false
  toast.success('Keranjang dikosongkan')
}

const categories = computed(() => {
  const set = new Set<string>()
  for (const p of products.value) if (p.category) set.add(p.category)
  return [...set].sort((a, b) => a.localeCompare(b, 'id'))
})

const filteredProducts = computed(() => {
  const q = search.value.toLowerCase().trim()
  return products.value.filter((p) => {
    if (selectedCategory.value && p.category !== selectedCategory.value) return false
    if (q && !p.name.toLowerCase().includes(q)) return false
    return true
  })
})

let channel: ReturnType<typeof supabase.channel> | null = null

async function loadProducts() {
  refreshing.value = true
  try {
    products.value = await fetchProducts()
    // Reconcile any cart restored from a previous session against current stock/prices.
    syncWithProducts(products.value)
  } catch {
    toast.error('Gagal memuat produk')
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  await loadProducts()

  // Keep the on-screen stock fresh when another register sells/edits a product.
  // Display-only — overselling is still prevented server-side at checkout.
  channel = supabase
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const oldId = (payload.old as Partial<Product>).id
        products.value = products.value.filter(p => p.id !== oldId)
        return
      }
      const row = payload.new as Product
      const idx = products.value.findIndex(p => p.id === row.id)
      if (idx === -1) {
        products.value = [...products.value, row].sort((a, b) => a.name.localeCompare(b.name, 'id'))
      } else {
        products.value[idx] = row
      }
    })
    .subscribe()
})

onUnmounted(() => {
  if (channel) supabase.removeChannel(channel)
})

function addToCart(p: Product) {
  if (processing.value) return // freeze the cart mid-checkout
  const result = addItem(p)
  if (result === 'out_of_stock') toast.error(`${p.name} stok habis`)
  else if (result === 'max_reached') toast.warning(`Stok ${p.name} tidak cukup`)
}

function onUpdateQuantity(productId: string, quantity: number) {
  const result = updateQuantity(productId, quantity)
  if (result === 'max_reached') toast.warning('Stok tidak cukup')
}

async function processTransaction() {
  if (items.value.length === 0) return
  if (!user.value) {
    toast.error('Sesi berakhir, silakan login ulang')
    return navigateTo('/login')
  }
  processing.value = true
  try {
    const soldItems = [...items.value]
    const paid = paymentMethod.value === 'cash' ? amountReceived.value : null
    const tx = await createTransaction(soldItems, paymentMethod.value, paid)
    cartOpen.value = false
    invoiceTransaction.value = tx
    showInvoice.value = true
    clearCart()
    amountReceived.value = null
    // Optimistic local stock update; realtime will reconcile other devices.
    for (const sold of soldItems) {
      const p = products.value.find(p => p.id === sold.product.id)
      if (p) p.stock -= sold.quantity
    }
    toast.success('Transaksi berhasil!')
    feedback.success()
  } catch (err: unknown) {
    console.error('[cashier] processTransaction:', err)
    const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi'
    toast.error(msg)
    feedback.error()
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="h-screen overflow-hidden bg-background flex flex-col">
    <header class="border-b px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3 shrink-0">
      <NuxtLink to="/">
        <Button variant="ghost" class="h-12 text-lg gap-2">
          <PhArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </NuxtLink>
      <h1 class="text-2xl lg:text-3xl font-bold">Kasir</h1>
    </header>

    <div class="flex flex-1 overflow-hidden flex-col lg:flex-row">
      <!-- Product Grid -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="p-3 lg:p-4 border-b flex flex-col gap-3">
          <div class="flex gap-3">
            <div class="relative flex-1">
              <PhMagnifyingGlass class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                v-model="search"
                class="h-12 text-lg pl-12"
                placeholder="Cari produk..."
              />
            </div>
            <Button
              variant="outline"
              class="h-12 w-12 shrink-0"
              :disabled="refreshing"
              aria-label="Muat ulang produk"
              @click="loadProducts"
            >
              <PhArrowsClockwise class="size-5" :class="refreshing ? 'animate-spin' : ''" />
            </Button>
          </div>

          <!-- Category filter chips -->
          <div v-if="categories.length" class="flex gap-2 overflow-x-auto pb-1">
            <button
              class="h-11 px-4 rounded-full border text-base font-medium whitespace-nowrap transition-colors"
              :class="selectedCategory === '' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
              @click="selectedCategory = ''"
            >
              Semua
            </button>
            <button
              v-for="cat in categories"
              :key="cat"
              class="h-11 px-4 rounded-full border text-base font-medium whitespace-nowrap transition-colors"
              :class="selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'"
              @click="selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <ScrollArea class="flex-1 min-h-0">
          <div class="p-3 lg:p-4 pb-28 lg:pb-4">
            <div
              v-if="filteredProducts.length === 0"
              class="flex items-center justify-center h-48 text-xl text-muted-foreground"
            >
              Produk tidak ditemukan
            </div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              <button
                v-for="p in filteredProducts"
                :key="p.id"
                :disabled="p.stock === 0 || processing"
                class="text-left rounded-lg border bg-card p-3 lg:p-4 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                @click="addToCart(p)"
              >
                <p class="text-base lg:text-lg font-semibold leading-tight">{{ p.name }}</p>
                <p class="text-sm text-foreground/70 mt-1">{{ p.unit }}</p>
                <p class="text-lg lg:text-xl font-bold text-primary mt-2">{{ formatIDR(p.price) }}</p>
                <Badge
                  :variant="p.stock === 0 ? 'destructive' : p.stock <= 5 ? 'secondary' : 'outline'"
                  class="mt-2 text-sm"
                >
                  Stok: {{ p.stock }}
                </Badge>
              </button>
            </div>
          </div>
        </ScrollArea>
      </div>

      <!-- Desktop Cart Sidebar -->
      <div class="hidden lg:flex lg:w-96 border-l flex-col bg-card overflow-hidden">
        <div class="p-4 border-b flex items-center gap-3">
          <PhShoppingCart class="size-7" />
          <span class="text-xl font-bold">Keranjang</span>
          <Badge v-if="itemCount > 0" class="ml-auto text-base px-3">{{ itemCount }} item</Badge>
        </div>

        <CartContents
          v-model:payment-method="paymentMethod"
          v-model:amount-received="amountReceived"
          :items="items"
          :total="total"
          :processing="processing"
          @update="onUpdateQuantity"
          @remove="removeItem"
          @process="processTransaction"
          @clear="showClearConfirm = true"
        />
      </div>
    </div>

    <!-- Mobile Sticky Bottom Bar -->
    <div class="fixed bottom-0 left-0 right-0 lg:hidden border-t bg-card/95 backdrop-blur-sm p-3 flex items-center gap-3 z-40">
      <div class="flex-1 min-w-0">
        <p v-if="itemCount === 0" class="text-lg text-muted-foreground">Keranjang kosong</p>
        <template v-else>
          <p class="text-xl font-bold text-primary truncate">{{ formatIDR(total) }}</p>
          <p class="text-sm text-foreground/70">{{ itemCount }} item</p>
        </template>
      </div>

      <Sheet v-model:open="cartOpen">
        <SheetTrigger as-child>
          <Button class="h-14 text-lg px-5 gap-2 shrink-0" :disabled="itemCount === 0">
            <PhShoppingCart class="size-5" />
            Keranjang
            <Badge v-if="itemCount > 0" variant="secondary" class="ml-1 text-sm px-2">{{ itemCount }}</Badge>
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" class="h-[88dvh]! flex flex-col p-0 rounded-t-xl">
          <SheetHeader class="p-4 border-b shrink-0">
            <SheetTitle class="text-xl flex items-center gap-2">
              <PhShoppingCart class="size-6" />
              Keranjang
              <Badge v-if="itemCount > 0" class="ml-auto text-base px-3">{{ itemCount }} item</Badge>
            </SheetTitle>
          </SheetHeader>

          <CartContents
            v-model:payment-method="paymentMethod"
            v-model:amount-received="amountReceived"
            :items="items"
            :total="total"
            :processing="processing"
            @update="onUpdateQuantity"
            @remove="removeItem"
            @process="processTransaction"
          />
        </SheetContent>
      </Sheet>
    </div>

    <!-- Clear cart confirmation -->
    <AlertDialog :open="showClearConfirm" @update:open="(v) => !v && (showClearConfirm = false)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia class="bg-destructive/10 text-destructive">
            <PhTrash />
          </AlertDialogMedia>
          <AlertDialogTitle class="text-2xl">Kosongkan Keranjang?</AlertDialogTitle>
          <AlertDialogDescription class="text-lg">
            Semua item di keranjang akan dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="h-12 text-lg">Batal</AlertDialogCancel>
          <AlertDialogAction class="h-12 text-lg" @click="handleClearCart">Ya, Kosongkan</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <InvoiceModal
      v-model:open="showInvoice"
      :transaction="invoiceTransaction"
      success
    />
  </div>
</template>
