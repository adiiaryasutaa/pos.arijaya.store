<script setup lang="ts">
import { PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import type { AppUser } from '@/composables/useUsers'

defineProps<{
  users: AppUser[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [user: AppUser]
  delete: [user: AppUser]
}>()

function formatLastSignIn(value: string | null): string {
  if (!value) return 'Belum pernah'
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="rounded-md border overflow-x-auto md:min-h-[40rem]">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="text-base">Nama</TableHead>
          <TableHead class="text-base">Email</TableHead>
          <TableHead class="text-base">Peran</TableHead>
          <TableHead class="text-base hidden md:table-cell">Terakhir Masuk</TableHead>
          <TableHead class="text-base text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading">
          <TableCell :colspan="5" class="text-center py-10">
            <Spinner class="mx-auto size-6" />
          </TableCell>
        </TableRow>
        <template v-else-if="users.length">
        <TableRow v-for="user in users" :key="user.id" class="h-14">
          <TableCell class="text-lg font-medium whitespace-nowrap">{{ user.full_name ?? '—' }}</TableCell>
          <TableCell class="text-lg whitespace-nowrap">{{ user.email }}</TableCell>
          <TableCell class="whitespace-nowrap">
            <Badge :variant="user.role === 'admin' ? 'default' : 'secondary'" class="text-sm">
              {{ user.role === 'admin' ? 'Admin' : 'Kasir' }}
            </Badge>
          </TableCell>
          <TableCell class="text-base text-muted-foreground hidden md:table-cell whitespace-nowrap">
            {{ formatLastSignIn(user.last_sign_in_at) }}
          </TableCell>
          <TableCell class="whitespace-nowrap">
            <div class="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-11 text-base gap-1.5"
                @click="emit('edit', user)"
              >
                <PhPencilSimple data-icon="inline-start" />
                <span class="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                class="h-11 text-base gap-1.5"
                @click="emit('delete', user)"
              >
                <PhTrash data-icon="inline-start" />
                <span class="hidden sm:inline">Hapus</span>
              </Button>
            </div>
          </TableCell>
        </TableRow>
        </template>
        <TableRow v-else>
          <TableCell :colspan="5" class="text-center text-base py-10 text-muted-foreground">
            Tidak ada pengguna yang cocok
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
