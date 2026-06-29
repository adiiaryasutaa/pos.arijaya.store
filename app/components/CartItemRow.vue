<script setup lang="ts">
import { PhMinus, PhPlus, PhTrash } from '@phosphor-icons/vue'
import type { CartItem } from '@/stores/cart'

const props = defineProps<{ item: CartItem }>()
const emit = defineEmits<{
  update: [productId: string, quantity: number]
  remove: [productId: string]
}>()

const { formatIDR } = useCurrency()

// Tap the quantity to type it directly — avoids dozens of +/- taps for large counts.
const editing = ref(false)
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

function startEdit() {
  draft.value = String(props.item.quantity)
  editing.value = true
  nextTick(() => inputEl.value?.select())
}

function commitEdit() {
  if (!editing.value) return
  editing.value = false
  const n = Math.floor(Number(draft.value))
  // Empty / invalid / zero removes the line (parent's updateQuantity handles <= 0).
  emit('update', props.item.product.id, Number.isFinite(n) ? n : 0)
}
</script>

<template>
  <div class="flex flex-col gap-2 p-3 rounded-lg border bg-background">
    <div class="flex items-start justify-between gap-2">
      <p class="text-lg font-medium leading-tight">{{ item.product.name }}</p>
      <button
        class="text-destructive hover:opacity-70 transition-opacity shrink-0 p-1"
        aria-label="Hapus dari keranjang"
        @click="emit('remove', item.product.id)"
      >
        <PhTrash class="size-5" />
      </button>
    </div>
    <div class="flex items-center justify-between">
      <p class="text-base text-foreground/80">{{ formatIDR(item.product.price) }}</p>
      <div class="flex items-center gap-2">
        <button
          class="size-12 rounded-md border flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
          aria-label="Kurangi jumlah"
          @click="emit('update', item.product.id, item.quantity - 1)"
        >
          <PhMinus class="size-5" />
        </button>

        <input
          v-if="editing"
          ref="inputEl"
          v-model="draft"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-16 h-12 text-center text-xl font-bold rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          @blur="commitEdit"
          @keyup.enter="commitEdit"
        >
        <button
          v-else
          class="w-16 h-12 text-center text-xl font-bold rounded-md hover:bg-accent transition-colors"
          aria-label="Ubah jumlah"
          @click="startEdit"
        >
          {{ item.quantity }}
        </button>

        <button
          class="size-12 rounded-md border flex items-center justify-center hover:bg-accent transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="item.quantity >= item.product.stock"
          aria-label="Tambah jumlah"
          @click="emit('update', item.product.id, item.quantity + 1)"
        >
          <PhPlus class="size-5" />
        </button>
      </div>
    </div>
    <p class="text-right text-lg font-semibold">
      {{ formatIDR(item.product.price * item.quantity) }}
    </p>
  </div>
</template>
