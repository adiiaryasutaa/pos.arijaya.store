<script setup lang="ts">
import { PhArrowLeft, PhReceipt, PhMagnifyingGlass, PhPlus } from '@phosphor-icons/vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import type { Transaction, TxFilters } from '@/composables/useTransactions'
import { TRANSACTIONS_PAGE_SIZE } from '@/composables/useTransactions'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Riwayat Transaksi' })

const { fetchTransactions, fetchSummary, resolveProductIds } = useTransactions()
const { fetchUsers } = useUsers()
const { formatIDR } = useCurrency()

const user = useSupabaseUser()
const isAdmin = computed(() => (user.value?.app_metadata as { role?: string })?.role === 'admin')

const transactions = ref<Transaction[]>([])
const summary = ref({ count: 0, total: 0 })
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const offset = ref(0)

// Filters
const dateFrom = ref('')
const dateTo = ref('')
const activePreset = ref<'today' | 'week' | 'month' | 'all' | 'custom'>('month')
const searchQuery = ref('')
const paymentMethod = ref<'all' | 'cash' | 'transfer'>('all')
const minTotal = ref('')
const maxTotal = ref('')
const cashierId = ref('all')

// Cashier dropdown + name map (admin only — names are not readable client-side otherwise).
const cashiers = ref<{ id: string, name: string }[]>([])
const cashierMap = computed(() => new Map(cashiers.value.map(c => [c.id, c.name])))

// The filter set used for the current list, reused by loadMore so pagination stays
// consistent (and the product-id search isn't re-resolved on every page).
const activeFilters = ref<TxFilters>({})

const selectedTransaction = ref<Transaction | null>(null)
const showInvoice = ref(false)

const presets = [
  { key: 'today', label: 'Hari ini' },
  { key: 'week', label: 'Minggu ini' },
  { key: 'month', label: 'Bulan ini' },
  { key: 'all', label: 'Semua' },
] as const

function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function parseAmount(s: string): number | undefined {
  const digits = s.replace(/[^\d]/g, '')
  return digits ? Number(digits) : undefined
}

async function buildFilters(): Promise<TxFilters> {
  const f: TxFilters = {
    from: dateFrom.value ? `${dateFrom.value}T00:00:00` : undefined,
    to: dateTo.value ? `${dateTo.value}T23:59:59` : undefined,
    paymentMethod: paymentMethod.value === 'all' ? undefined : paymentMethod.value,
    minTotal: parseAmount(minTotal.value),
    maxTotal: parseAmount(maxTotal.value),
    cashierId: cashierId.value === 'all' ? undefined : cashierId.value,
  }
  if (searchQuery.value.trim()) {
    f.idFilter = await resolveProductIds(searchQuery.value)
  }
  return f
}

function applyPreset(key: typeof presets[number]['key']) {
  const now = new Date()
  if (key === 'today') {
    dateFrom.value = ymd(now)
    dateTo.value = ymd(now)
  } else if (key === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    dateFrom.value = ymd(start)
    dateTo.value = ymd(now)
  } else if (key === 'month') {
    dateFrom.value = ymd(new Date(now.getFullYear(), now.getMonth(), 1))
    dateTo.value = ymd(now)
  } else {
    dateFrom.value = ''
    dateTo.value = ''
  }
  activePreset.value = key
  load()
}

function applyManualFilter() {
  activePreset.value = 'custom'
  load()
}

function onPaymentChange(val: unknown) {
  if (val === 'all' || val === 'cash' || val === 'transfer') {
    paymentMethod.value = val
    load()
  }
}

async function load() {
  loading.value = true
  offset.value = 0
  try {
    const f = await buildFilters()
    activeFilters.value = f
    const [page, sum] = await Promise.all([
      fetchTransactions({ ...f, offset: 0 }),
      fetchSummary(f),
    ])
    transactions.value = page.rows
    hasMore.value = page.hasMore
    summary.value = sum
  } catch {
    toast.error('Gagal memuat transaksi')
  } finally {
    loading.value = false
  }
}

const debouncedSearch = useDebounceFn(load, 300)
watch(searchQuery, () => debouncedSearch())
watch(cashierId, () => load())

async function loadMore() {
  loadingMore.value = true
  try {
    offset.value += TRANSACTIONS_PAGE_SIZE
    const page = await fetchTransactions({ ...activeFilters.value, offset: offset.value })
    transactions.value.push(...page.rows)
    hasMore.value = page.hasMore
  } catch {
    toast.error('Gagal memuat lebih banyak')
  } finally {
    loadingMore.value = false
  }
}

onMounted(async () => {
  applyPreset('month')
  if (isAdmin.value) {
    try {
      const users = await fetchUsers()
      cashiers.value = users.map(u => ({ id: u.id, name: u.full_name || u.email }))
    } catch {
      // Non-fatal: cashier filter simply stays empty if the list can't load.
    }
  }
})

function openInvoice(tx: Transaction) {
  selectedTransaction.value = tx
  showInvoice.value = true
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cashierName(tx: Transaction): string {
  if (!tx.user_id) return 'Tidak diketahui'
  return cashierMap.value.get(tx.user_id) ?? 'Tidak diketahui'
}

const paymentLabel = (method: string) => method === 'cash' ? 'Tunai' : 'Transfer'
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div class="container mx-auto px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3">
        <h1 class="text-2xl lg:text-3xl font-bold">Riwayat Transaksi</h1>
      </div>
    </header>

    <main class="p-4 lg:p-6 container mx-auto flex flex-col gap-4 lg:gap-6">
      <NuxtLink to="/" class="w-fit">
        <Button variant="ghost" class="h-12 text-lg gap-2">
          <PhArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </NuxtLink>
      <!-- Filter -->
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Filter</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <!-- Product search -->
          <div class="relative">
            <PhMagnifyingGlass
              class="absolute left-3 top-1/2 -translate-y-1/2 size-6 text-muted-foreground pointer-events-none"
            />
            <Input
              v-model="searchQuery"
              class="h-12 text-lg pl-12"
              placeholder="Cari produk..."
            />
          </div>

          <!-- Payment method -->
          <ToggleGroup
            type="single"
            variant="outline"
            :model-value="paymentMethod"
            class="w-full"
            @update:model-value="onPaymentChange"
          >
            <ToggleGroupItem value="all" class="flex-1 h-12 text-lg">Semua</ToggleGroupItem>
            <ToggleGroupItem value="cash" class="flex-1 h-12 text-lg">Tunai</ToggleGroupItem>
            <ToggleGroupItem value="transfer" class="flex-1 h-12 text-lg">Transfer</ToggleGroupItem>
          </ToggleGroup>

          <!-- Cashier (admin only) -->
          <div v-if="isAdmin" class="flex flex-col gap-2">
            <label class="text-lg font-medium">Kasir</label>
            <Select v-model="cashierId">
              <SelectTrigger class="h-12 text-lg">
                <SelectValue placeholder="Semua kasir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" class="text-lg">Semua kasir</SelectItem>
                <SelectItem v-for="c in cashiers" :key="c.id" :value="c.id" class="text-lg">
                  {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Quick presets -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              v-for="p in presets"
              :key="p.key"
              :variant="activePreset === p.key ? 'default' : 'outline'"
              class="h-12 text-lg"
              @click="applyPreset(p.key)"
            >
              {{ p.label }}
            </Button>
          </div>

          <!-- Manual date range + amount range -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-lg font-medium">Dari Tanggal</label>
              <Input v-model="dateFrom" type="date" class="h-12 text-lg" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-lg font-medium">Sampai Tanggal</label>
              <Input v-model="dateTo" type="date" class="h-12 text-lg" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-lg font-medium">Nominal Min (Rp)</label>
              <Input
                v-model="minTotal"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                class="h-12 text-lg"
                placeholder="0"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-lg font-medium">Nominal Maks (Rp)</label>
              <Input
                v-model="maxTotal"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                class="h-12 text-lg"
                placeholder="Tanpa batas"
              />
            </div>
          </div>
          <Button variant="outline" class="h-12 text-lg w-full" @click="applyManualFilter">
            Terapkan
          </Button>
        </CardContent>
      </Card>

      <!-- Summary -->
      <div v-if="!loading" class="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader class="pb-2">
            <CardDescription class="text-base">Jumlah Transaksi</CardDescription>
            <CardTitle class="text-3xl">{{ summary.count }}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription class="text-base">Total Pendapatan</CardDescription>
            <CardTitle class="text-2xl">{{ formatIDR(summary.total) }}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <!-- Transaction List -->
      <div v-if="loading" class="flex flex-col gap-3">
        <Skeleton v-for="i in 5" :key="i" class="h-24 w-full rounded-lg" />
      </div>

      <Empty v-else-if="transactions.length === 0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PhReceipt class="size-6" />
          </EmptyMedia>
          <EmptyTitle class="text-2xl">Belum ada transaksi</EmptyTitle>
          <EmptyDescription class="text-lg">
            {{ activePreset === 'all' && !searchQuery ? 'Belum ada transaksi tercatat' : 'Tidak ada transaksi yang cocok dengan filter' }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent v-if="activePreset === 'all' && !searchQuery">
          <NuxtLink to="/cashier">
            <Button class="h-12 text-lg gap-2">
              <PhPlus data-icon="inline-start" />
              Mulai Transaksi
            </Button>
          </NuxtLink>
        </EmptyContent>
      </Empty>

      <template v-else>
        <div class="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="text-base">Tanggal</TableHead>
                <TableHead class="text-base">Item</TableHead>
                <TableHead v-if="isAdmin" class="text-base hidden md:table-cell">Kasir</TableHead>
                <TableHead class="text-base">Bayar</TableHead>
                <TableHead class="text-base text-right">Total</TableHead>
                <TableHead class="text-base text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="tx in transactions"
                :key="tx.id"
                class="cursor-pointer"
                @click="openInvoice(tx)"
              >
                <TableCell class="text-lg font-medium whitespace-nowrap">
                  {{ formatDate(tx.created_at) }}
                </TableCell>
                <TableCell class="text-base text-foreground/70 whitespace-nowrap">
                  {{ tx.transaction_items.length }} produk ·
                  {{ tx.transaction_items.reduce((s, i) => s + i.quantity, 0) }} item
                </TableCell>
                <TableCell v-if="isAdmin" class="text-base text-foreground/70 hidden md:table-cell">
                  {{ cashierName(tx) }}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" class="text-sm">{{ paymentLabel(tx.payment_method) }}</Badge>
                </TableCell>
                <TableCell class="text-lg font-bold text-primary text-right whitespace-nowrap">
                  {{ formatIDR(tx.total) }}
                </TableCell>
                <TableCell>
                  <div class="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-11 text-base gap-1.5"
                      @click.stop="openInvoice(tx)"
                    >
                      <PhReceipt data-icon="inline-start" />
                      <span class="hidden sm:inline">Struk</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Button
          v-if="hasMore"
          variant="outline"
          class="h-14 text-lg w-full"
          :disabled="loadingMore"
          @click="loadMore"
        >
          <Spinner v-if="loadingMore" data-icon="inline-start" />
          {{ loadingMore ? 'Memuat...' : 'Muat lebih banyak' }}
        </Button>
      </template>
    </main>

    <InvoiceModal
      v-model:open="showInvoice"
      :transaction="selectedTransaction"
    />
  </div>
</template>
