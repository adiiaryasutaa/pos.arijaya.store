<script setup lang="ts">
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'
import type { AppUser, UserInput } from '@/composables/useUsers'

const props = defineProps<{
  user?: AppUser | null
}>()

const emit = defineEmits<{
  submit: [data: UserInput]
  cancel: []
}>()

const isEdit = computed(() => !!props.user)

const form = reactive<UserInput>({
  email: props.user?.email ?? '',
  password: '',
  role: props.user?.role ?? 'kasir',
  full_name: props.user?.full_name ?? '',
})

watch(
  () => props.user,
  (u) => {
    form.email = u?.email ?? ''
    form.password = ''
    form.role = u?.role ?? 'kasir'
    form.full_name = u?.full_name ?? ''
  },
)

const showPassword = ref(false)

function onRoleChange(val: unknown) {
  if (val === 'admin' || val === 'kasir') form.role = val
}

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
    <FieldGroup>
      <Field>
        <FieldLabel class="text-lg">Nama Lengkap *</FieldLabel>
        <Input v-model="form.full_name" class="h-12 text-lg" placeholder="Nama pengguna" required />
      </Field>

      <Field>
        <FieldLabel class="text-lg">Email *</FieldLabel>
        <Input
          v-model="form.email"
          type="email"
          class="h-12 text-lg"
          placeholder="email@contoh.com"
          autocomplete="off"
          required
        />
      </Field>

      <Field>
        <FieldLabel class="text-lg">Peran *</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          :model-value="form.role"
          class="w-full"
          @update:model-value="onRoleChange"
        >
          <ToggleGroupItem value="kasir" class="flex-1 h-12 text-lg">Kasir</ToggleGroupItem>
          <ToggleGroupItem value="admin" class="flex-1 h-12 text-lg">Admin</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Field>
        <FieldLabel class="text-lg">
          {{ isEdit ? 'Password Baru' : 'Password *' }}
        </FieldLabel>
        <div class="relative">
          <Input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            class="h-12 text-lg pr-14"
            :required="!isEdit"
            minlength="8"
            autocomplete="new-password"
            :placeholder="isEdit ? 'Kosongkan jika tidak diganti' : 'Min. 8 karakter'"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
            :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
            @click="showPassword = !showPassword"
          >
            <PhEyeSlash v-if="showPassword" class="size-6" />
            <PhEye v-else class="size-6" />
          </button>
        </div>
      </Field>
    </FieldGroup>

    <div class="flex gap-3 pt-2">
      <Button type="button" variant="outline" class="flex-1 h-12 text-lg" @click="emit('cancel')">
        Batal
      </Button>
      <Button type="submit" class="flex-1 h-12 text-lg">
        {{ isEdit ? 'Simpan Perubahan' : 'Tambah Pengguna' }}
      </Button>
    </div>
  </form>
</template>
