<script setup lang="ts">
import { PhArrowLeft, PhFunnel, PhReceipt } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { Transaction } from '@/composables/useTransactions'

definePageMeta({ middleware: 'auth' })

const { fetchTransactions } = useTransactions()
const { formatIDR } = useCurrency()

const transactions = ref<Transaction[]>([])
const loading = ref(true)
const dateFrom = ref('')
const dateTo = ref('')
const selectedTransaction = ref<Transaction | null>(null)
const showInvoice = ref(false)

async function load() {
  loading.value = true
  try {
    const from = dateFrom.value ? `${dateFrom.value}T00:00:00` : undefined
    const to = dateTo.value ? `${dateTo.value}T23:59:59` : undefined
    transactions.value = await fetchTransactions(from, to)
  } catch {
    toast.error('Gagal memuat transaksi')
  } finally {
    loading.value = false
  }
}

onMounted(load)

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

const totalRevenue = computed(() =>
  transactions.value.reduce((sum, tx) => sum + tx.total, 0)
)

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
          <CardTitle class="text-xl">Filter Tanggal</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col sm:flex-row gap-4 items-end">
            <div class="flex-1 flex flex-col gap-2">
              <label class="text-lg font-medium">Dari Tanggal</label>
              <Input v-model="dateFrom" type="date" class="h-12 text-lg" />
            </div>
            <div class="flex-1 flex flex-col gap-2">
              <label class="text-lg font-medium">Sampai Tanggal</label>
              <Input v-model="dateTo" type="date" class="h-12 text-lg" />
            </div>
            <Button class="h-12 text-lg gap-2 sm:w-auto w-full" @click="load">
              <PhFunnel data-icon="inline-start" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Summary -->
      <div v-if="!loading" class="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader class="pb-2">
            <CardDescription class="text-base">Jumlah Transaksi</CardDescription>
            <CardTitle class="text-3xl">{{ transactions.length }}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription class="text-base">Total Pendapatan</CardDescription>
            <CardTitle class="text-2xl">{{ formatIDR(totalRevenue) }}</CardTitle>
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
            {{ dateFrom || dateTo ? 'Tidak ada transaksi pada periode ini' : 'Belum ada transaksi tercatat' }}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div v-else class="flex flex-col gap-3">
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
                <p class="text-base text-muted-foreground">
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
    </main>

    <InvoiceModal
      v-model:open="showInvoice"
      :transaction="selectedTransaction"
    />
  </div>
</template>
