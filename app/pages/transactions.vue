<script setup lang="ts">
import { PhArrowLeft, PhReceipt } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { Transaction } from '@/composables/useTransactions'
import { TRANSACTIONS_PAGE_SIZE } from '@/composables/useTransactions'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Riwayat Transaksi — Toko Arijaya' })

const { fetchTransactions, fetchSummary } = useTransactions()
const { formatIDR } = useCurrency()

const transactions = ref<Transaction[]>([])
const summary = ref({ count: 0, total: 0 })
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const offset = ref(0)

const dateFrom = ref('')
const dateTo = ref('')
const activePreset = ref<'today' | 'week' | 'month' | 'all' | 'custom'>('month')

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

function range() {
  return {
    from: dateFrom.value ? `${dateFrom.value}T00:00:00` : undefined,
    to: dateTo.value ? `${dateTo.value}T23:59:59` : undefined,
  }
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

async function load() {
  loading.value = true
  offset.value = 0
  try {
    const { from, to } = range()
    const [page, sum] = await Promise.all([
      fetchTransactions({ from, to, offset: 0 }),
      fetchSummary(from, to),
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

async function loadMore() {
  loadingMore.value = true
  try {
    const { from, to } = range()
    offset.value += TRANSACTIONS_PAGE_SIZE
    const page = await fetchTransactions({ from, to, offset: offset.value })
    transactions.value.push(...page.rows)
    hasMore.value = page.hasMore
  } catch {
    toast.error('Gagal memuat lebih banyak')
  } finally {
    loadingMore.value = false
  }
}

onMounted(() => applyPreset('month'))

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

const paymentLabel = (method: string) => method === 'cash' ? 'Tunai' : 'Transfer'
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
      <h1 class="text-2xl lg:text-3xl font-bold">Riwayat Transaksi</h1>
    </header>

    <main class="p-4 lg:p-6 max-w-4xl mx-auto flex flex-col gap-4 lg:gap-6">
      <!-- Filter -->
      <Card>
        <CardHeader>
          <CardTitle class="text-xl">Periode</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
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

          <!-- Manual range -->
          <div class="flex flex-col sm:flex-row gap-4 items-end">
            <div class="flex-1 flex flex-col gap-2">
              <label class="text-lg font-medium">Dari Tanggal</label>
              <Input v-model="dateFrom" type="date" class="h-12 text-lg" />
            </div>
            <div class="flex-1 flex flex-col gap-2">
              <label class="text-lg font-medium">Sampai Tanggal</label>
              <Input v-model="dateTo" type="date" class="h-12 text-lg" />
            </div>
            <Button variant="outline" class="h-12 text-lg sm:w-auto w-full" @click="applyManualFilter">
              Terapkan
            </Button>
          </div>
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
          <EmptyTitle class="text-2xl">Belum ada transaksi</EmptyTitle>
          <EmptyDescription class="text-lg">
            {{ activePreset === 'all' ? 'Belum ada transaksi tercatat' : 'Tidak ada transaksi pada periode ini' }}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <template v-else>
        <div class="flex flex-col gap-3">
          <Card
            v-for="tx in transactions"
            :key="tx.id"
            class="cursor-pointer hover:bg-accent transition-colors"
            @click="openInvoice(tx)"
          >
            <CardContent class="pt-4 pb-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex flex-col gap-1">
                  <p class="text-lg font-semibold">{{ formatDate(tx.created_at) }}</p>
                  <p class="text-base text-foreground/70">
                    {{ tx.transaction_items.length }} produk ·
                    {{ tx.transaction_items.reduce((s, i) => s + i.quantity, 0) }} item
                  </p>
                </div>
                <div class="flex items-center gap-3 sm:flex-col sm:items-end">
                  <p class="text-xl font-bold text-primary">{{ formatIDR(tx.total) }}</p>
                  <Badge variant="outline" class="text-base px-3 py-1">
                    {{ paymentLabel(tx.payment_method) }}
                  </Badge>
                </div>
                <Button variant="outline" class="h-12 text-lg gap-2 w-full sm:w-auto shrink-0">
                  <PhReceipt data-icon="inline-start" />
                  Struk
                </Button>
              </div>
            </CardContent>
          </Card>
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
