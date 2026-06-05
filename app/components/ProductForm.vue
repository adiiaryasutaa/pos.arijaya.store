<script setup lang="ts">
import type { Product, ProductInput } from '@/composables/useProducts'

const props = defineProps<{
  product?: Product | null
}>()

const emit = defineEmits<{
  submit: [data: ProductInput]
  cancel: []
}>()

const form = reactive<ProductInput>({
  name: props.product?.name ?? '',
  price: props.product?.price ?? 0,
  stock: props.product?.stock ?? 0,
  category: props.product?.category ?? null,
  unit: props.product?.unit ?? 'pcs',
})

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
    <FieldGroup>
      <Field>
        <FieldLabel class="text-lg">Nama Produk *</FieldLabel>
        <Input v-model="form.name" class="h-12 text-lg" placeholder="Nama produk" required />
      </Field>

      <Field>
        <FieldLabel class="text-lg">Harga (Rp) *</FieldLabel>
        <Input
          v-model.number="form.price"
          type="number"
          class="h-12 text-lg"
          placeholder="0"
          min="0"
          required
        />
      </Field>

      <Field>
        <FieldLabel class="text-lg">Stok *</FieldLabel>
        <Input
          v-model.number="form.stock"
          type="number"
          class="h-12 text-lg"
          placeholder="0"
          min="0"
          required
        />
      </Field>

      <Field>
        <FieldLabel class="text-lg">Satuan *</FieldLabel>
        <Input v-model="form.unit" class="h-12 text-lg" placeholder="pcs, kg, liter..." required />
      </Field>

      <Field>
        <FieldLabel class="text-lg">Kategori (opsional)</FieldLabel>
        <Input
          :model-value="form.category ?? ''"
          class="h-12 text-lg"
          placeholder="Makanan, Minuman..."
          @update:model-value="form.category = ($event as string) || null"
        />
      </Field>
    </FieldGroup>

    <div class="flex gap-3 pt-2">
      <Button type="button" variant="outline" class="flex-1 h-12 text-lg" @click="emit('cancel')">
        Batal
      </Button>
      <Button type="submit" class="flex-1 h-12 text-lg">
        {{ product ? 'Simpan Perubahan' : 'Tambah Produk' }}
      </Button>
    </div>
  </form>
</template>
