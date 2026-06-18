<script setup lang="ts">
import { PhShoppingCart } from '@phosphor-icons/vue'
import type { CartItem } from '@/composables/useCart'

const props = defineProps<{
  items: CartItem[]
  total: number
  processing: boolean
}>()

const emit = defineEmits<{
  update: [productId: string, quantity: number]
  remove: [productId: string]
  process: []
}>()

const paymentMethod = defineModel<'cash' | 'transfer'>('paymentMethod', { required: true })
const amountReceived = defineModel<number | null>('amountReceived', { default: null })

const { formatIDR } = useCurrency()

// Common rupiah notes so the cashier can tap instead of typing the full amount.
const quickAmounts = [20000, 50000, 100000]

// Clearing the input yields NaN via v-model.number — treat as "no amount entered yet".
const received = computed(() => {
  const v = amountReceived.value
  return v == null || Number.isNaN(v) ? null : v
})

const change = computed(() => received.value == null ? null : received.value - props.total)

const isCash = computed(() => paymentMethod.value === 'cash')

// Cash requires enough money tendered; transfer is always allowed.
const canProcess = computed(() => {
  if (props.items.length === 0 || props.processing) return false
  if (isCash.value) return received.value != null && received.value >= props.total
  return true
})

function setExact() {
  amountReceived.value = props.total
}
</script>

<template>
  <!-- Item list -->
  <ScrollArea class="flex-1 p-4">
    <div v-if="items.length === 0" class="flex flex-col items-center justify-center gap-2 h-32 text-muted-foreground">
      <PhShoppingCart class="size-10" />
      <p class="text-lg">Keranjang kosong</p>
    </div>
    <div v-else class="flex flex-col gap-3">
      <CartItemRow
        v-for="item in items"
        :key="item.product.id"
        :item="item"
        @update="(id, qty) => emit('update', id, qty)"
        @remove="(id) => emit('remove', id)"
      />
    </div>
  </ScrollArea>

  <!-- Checkout footer -->
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

    <!-- Cash received + change (kembalian) -->
    <div v-if="isCash" class="flex flex-col gap-2">
      <p class="text-lg font-medium">Uang Diterima</p>
      <Input
        v-model.number="amountReceived"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        placeholder="0"
        class="h-14 text-xl"
      />
      <div class="grid grid-cols-4 gap-2">
        <Button type="button" variant="outline" class="h-12 text-base" @click="setExact">
          Pas
        </Button>
        <Button
          v-for="amt in quickAmounts"
          :key="amt"
          type="button"
          variant="outline"
          class="h-12 text-base"
          @click="amountReceived = amt"
        >
          {{ (amt / 1000) }}rb
        </Button>
      </div>
      <div
        v-if="change != null"
        class="flex justify-between items-center rounded-lg p-3"
        :class="change < 0 ? 'bg-destructive/10' : 'bg-accent'"
      >
        <span class="text-lg font-medium">
          {{ change < 0 ? 'Kurang' : 'Kembalian' }}
        </span>
        <span
          class="text-2xl font-bold"
          :class="change < 0 ? 'text-destructive' : 'text-primary'"
        >
          {{ formatIDR(Math.abs(change)) }}
        </span>
      </div>
    </div>

    <Button
      class="h-16 text-xl w-full"
      :disabled="!canProcess"
      @click="emit('process')"
    >
      <Spinner v-if="processing" data-icon="inline-start" />
      {{ processing ? 'Memproses...' : 'Proses Transaksi' }}
    </Button>
  </div>
</template>
