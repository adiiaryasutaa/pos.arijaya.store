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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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
const cartOpen = ref(false)

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
    cartOpen.value = false
    invoiceTransaction.value = tx
    showInvoice.value = true
    clearCart()
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
        <div class="p-3 lg:p-4 border-b">
          <div class="relative">
            <PhMagnifyingGlass class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              v-model="search"
              class="h-12 text-lg pl-12"
              placeholder="Cari produk..."
            />
          </div>
        </div>

        <ScrollArea class="flex-1">
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
                :disabled="p.stock === 0"
                class="text-left rounded-lg border bg-card p-3 lg:p-4 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                @click="addItem(p)"
              >
                <p class="text-base lg:text-lg font-semibold leading-tight">{{ p.name }}</p>
                <p class="text-sm text-muted-foreground mt-1">{{ p.unit }}</p>
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
      <div class="hidden lg:flex lg:w-96 border-l flex-col bg-card">
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
                    class="size-12 rounded-md border flex items-center justify-center hover:bg-accent transition-colors"
                    @click="updateQuantity(item.product.id, item.quantity - 1)"
                  >
                    <PhMinus class="size-5" />
                  </button>
                  <span class="w-10 text-center text-xl font-bold">{{ item.quantity }}</span>
                  <button
                    class="size-12 rounded-md border flex items-center justify-center hover:bg-accent transition-colors"
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

        <div class="p-4 border-t flex flex-col gap-4">
          <Separator />
          <div class="flex justify-between items-center">
            <span class="text-xl font-bold">Total</span>
            <span class="text-2xl font-bold text-primary">{{ formatIDR(total) }}</span>
          </div>
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

    <!-- Mobile Sticky Bottom Bar -->
    <div class="fixed bottom-0 left-0 right-0 lg:hidden border-t bg-card/95 backdrop-blur-sm p-3 flex items-center gap-3 z-40">
      <div class="flex-1 min-w-0">
        <p v-if="itemCount === 0" class="text-lg text-muted-foreground">Keranjang kosong</p>
        <template v-else>
          <p class="text-xl font-bold text-primary truncate">{{ formatIDR(total) }}</p>
          <p class="text-sm text-muted-foreground">{{ itemCount }} item</p>
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

        <SheetContent side="bottom" class="h-[88dvh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader class="p-4 border-b shrink-0">
            <SheetTitle class="text-xl flex items-center gap-2">
              <PhShoppingCart class="size-6" />
              Keranjang
              <Badge v-if="itemCount > 0" class="ml-auto text-base px-3">{{ itemCount }} item</Badge>
            </SheetTitle>
          </SheetHeader>

          <!-- Scrollable Items -->
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
                      class="size-12 rounded-md border flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
                      @click="updateQuantity(item.product.id, item.quantity - 1)"
                    >
                      <PhMinus class="size-5" />
                    </button>
                    <span class="w-10 text-center text-xl font-bold">{{ item.quantity }}</span>
                    <button
                      class="size-12 rounded-md border flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
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

          <!-- Sheet Cart Footer -->
          <div class="p-4 border-t flex flex-col gap-4 shrink-0 bg-card">
            <div class="flex justify-between items-center">
              <span class="text-xl font-bold">Total</span>
              <span class="text-2xl font-bold text-primary">{{ formatIDR(total) }}</span>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-lg font-medium">Metode Pembayaran</p>
              <ToggleGroup
                v-model="paymentMethod"
                type="single"
                class="grid grid-cols-2 gap-2"
              >
                <ToggleGroupItem value="cash" class="h-14 text-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Tunai
                </ToggleGroupItem>
                <ToggleGroupItem value="transfer" class="h-14 text-lg border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
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
        </SheetContent>
      </Sheet>
    </div>

    <InvoiceModal
      v-model:open="showInvoice"
      :transaction="invoiceTransaction"
    />
  </div>
</template>
