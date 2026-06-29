<script setup lang="ts">
import { PhShareNetwork, PhX } from '@phosphor-icons/vue'
import type { Transaction } from '@/composables/useTransactions'

const props = defineProps<{
  open: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { formatIDR } = useCurrency()
const { storeName } = storeToRefs(useSettingsStore())

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

const paymentLabel = computed(() => {
  if (!props.transaction) return ''
  return props.transaction.payment_method === 'cash' ? 'Tunai' : 'Transfer'
})

const canShare = typeof navigator !== 'undefined' && !!navigator.share

async function share() {
  if (!props.transaction) return
  const text = [
    `Struk Belanja - ${storeName.value}`,
    `Tanggal: ${formatDate(props.transaction.created_at)}`,
    `No. Transaksi: ${shortId(props.transaction.id)}`,
    '',
    ...props.transaction.transaction_items.map(
      i => `${i.product_name} x${i.quantity} = ${formatIDR(i.subtotal)}`
    ),
    '',
    `TOTAL: ${formatIDR(props.transaction.total)}`,
    `Pembayaran: ${paymentLabel.value}`,
    ...(props.transaction.amount_paid != null
      ? [
          `Bayar: ${formatIDR(props.transaction.amount_paid)}`,
          `Kembali: ${formatIDR(props.transaction.change_amount ?? 0)}`,
        ]
      : []),
    '',
    'Terima kasih telah berbelanja!',
  ].join('\n')

  try {
    await navigator.share({ text })
  } catch {
    // user cancelled share
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="w-[calc(100%-2rem)] max-w-lg">
      <DialogHeader class="border-0 pb-0 pr-0">
        <DialogTitle class="sr-only">Struk Belanja</DialogTitle>
      </DialogHeader>

      <div v-if="transaction" class="flex flex-col gap-4">
        <!-- Store Header -->
        <div class="text-center border-b pb-4">
          <p class="text-2xl font-bold">{{ storeName }}</p>
          <p class="text-base text-foreground/70 mt-1">{{ formatDate(transaction.created_at) }}</p>
          <p class="text-sm text-foreground/60">No. {{ shortId(transaction.id) }}</p>
        </div>

        <!-- Items -->
        <div class="flex flex-col gap-2">
          <div
            v-for="item in transaction.transaction_items"
            :key="item.id ?? item.product_name"
            class="flex justify-between items-start gap-2"
          >
            <div class="flex-1">
              <p class="text-lg font-medium">{{ item.product_name }}</p>
              <p class="text-base text-foreground/70">
                {{ formatIDR(item.product_price) }} × {{ item.quantity }}
              </p>
            </div>
            <p class="text-lg font-semibold shrink-0">{{ formatIDR(item.subtotal) }}</p>
          </div>
        </div>

        <Separator />

        <!-- Total -->
        <div class="flex justify-between items-center">
          <p class="text-xl font-bold">TOTAL</p>
          <p class="text-2xl font-bold text-primary">{{ formatIDR(transaction.total) }}</p>
        </div>

        <div class="flex justify-between items-center text-lg">
          <p class="text-muted-foreground">Pembayaran</p>
          <Badge variant="outline" class="text-base px-3 py-1">{{ paymentLabel }}</Badge>
        </div>

        <!-- Cash tendered + change -->
        <template v-if="transaction.amount_paid != null">
          <div class="flex justify-between items-center text-lg">
            <p class="text-muted-foreground">Bayar</p>
            <p class="font-medium">{{ formatIDR(transaction.amount_paid) }}</p>
          </div>
          <div class="flex justify-between items-center text-lg">
            <p class="text-muted-foreground">Kembali</p>
            <p class="font-semibold">{{ formatIDR(transaction.change_amount ?? 0) }}</p>
          </div>
        </template>

        <Separator />

        <p class="text-center text-lg text-muted-foreground">Terima kasih telah berbelanja!</p>

        <!-- Actions -->
        <div class="flex gap-3 pt-2">
          <Button
            variant="outline"
            class="flex-1 h-12 text-lg"
            @click="emit('update:open', false)"
          >
            <PhX data-icon="inline-start" />
            Tutup
          </Button>
          <Button v-if="canShare" class="flex-1 h-12 text-lg" @click="share">
            <PhShareNetwork data-icon="inline-start" />
            Bagikan
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
