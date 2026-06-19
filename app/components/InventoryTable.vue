<script setup lang="ts">
import {
  FlexRender,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/vue-table'
import { IconPencil, IconTrash, IconChevronUp, IconChevronDown, IconSelector, IconFileExport, IconChevronLeft, IconChevronRight } from '@tabler/icons-vue'
import { toast } from 'vue-sonner'
import type { Product } from '@/composables/useProducts'
import { valueUpdater } from '@/components/ui/table/utils'

const props = defineProps<{
  products: Product[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [product: Product]
  delete: [product: Product]
  refresh: []
}>()

const { formatIDR } = useCurrency()
const { deleteProduct } = useProducts()

// --- Filters (pre-table, client-side) ---
const nameFilter = ref('')
const categoryFilter = ref('__all__')
const stockFilter = ref('all')

const categories = computed(() => {
  const cats = props.products
    .map((p) => p.category)
    .filter((c): c is string => !!c)
  return [...new Set(cats)].sort()
})

const filteredProducts = computed(() => {
  return props.products.filter((p) => {
    if (categoryFilter.value !== '__all__' && p.category !== categoryFilter.value) return false
    if (stockFilter.value === 'in' && p.stock === 0) return false
    if (stockFilter.value === 'out' && p.stock > 0) return false
    return true
  })
})

// --- TanStack table state ---
const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const rowSelection = ref<RowSelectionState>({})
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 })

// Sync nameFilter → TanStack columnFilter
watch(nameFilter, (v) => {
  columnFilters.value = v ? [{ id: 'name', value: v }] : []
  pagination.value = { ...pagination.value, pageIndex: 0 }
})

// Reset to page 1 when category/stock filters change
watch([categoryFilter, stockFilter], () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
})

// --- Column definitions ---
const col = createColumnHelper<Product>()

const columns = [
  col.display({
    id: 'select',
    header: ({ table }) => h('input', {
      type: 'checkbox',
      class: 'size-4 cursor-pointer',
      checked: table.getIsAllPageRowsSelected(),
      indeterminate: table.getIsSomePageRowsSelected(),
      onChange: (e: Event) => table.toggleAllPageRowsSelected((e.target as HTMLInputElement).checked),
    }),
    cell: ({ row }) => h('input', {
      type: 'checkbox',
      class: 'size-4 cursor-pointer',
      checked: row.getIsSelected(),
      disabled: !row.getCanSelect(),
      onChange: (e: Event) => row.toggleSelected((e.target as HTMLInputElement).checked),
    }),
    enableSorting: false,
  }),
  col.accessor('name', {
    header: 'Nama',
    enableSorting: true,
    filterFn: 'includesString',
  }),
  col.accessor('category', {
    header: 'Kategori',
    enableSorting: true,
    cell: ({ getValue }) => getValue() ?? '–',
  }),
  col.accessor('unit', {
    header: 'Satuan',
    enableSorting: false,
  }),
  col.accessor('price', {
    header: 'Harga',
    enableSorting: true,
    cell: ({ getValue }) => formatIDR(getValue()),
  }),
  col.accessor('stock', {
    header: 'Stok',
    enableSorting: true,
  }),
  col.display({
    id: 'actions',
    header: '',
    enableSorting: false,
  }),
]

const table = useVueTable({
  get data() { return filteredProducts.value },
  columns,
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get rowSelection() { return rowSelection.value },
    get pagination() { return pagination.value },
  },
  enableRowSelection: true,
  onSortingChange: (u) => valueUpdater(u, sorting),
  onColumnFiltersChange: (u) => valueUpdater(u, columnFilters),
  onRowSelectionChange: (u) => valueUpdater(u, rowSelection),
  onPaginationChange: (u) => valueUpdater(u, pagination),
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
})

// --- Bulk selection helpers ---
const selectedRows = computed(() =>
  table.getSelectedRowModel().rows.map((r) => r.original),
)
const selectedCount = computed(() => selectedRows.value.length)

// --- Bulk delete ---
const showBulkDeleteDialog = ref(false)
const bulkDeleting = ref(false)

async function confirmBulkDelete() {
  bulkDeleting.value = true
  try {
    await Promise.all(selectedRows.value.map((p) => deleteProduct(p.id)))
    toast.success(`${selectedCount.value} produk berhasil dihapus`)
    rowSelection.value = {}
    showBulkDeleteDialog.value = false
    emit('refresh')
  } catch {
    toast.error('Gagal menghapus produk')
  } finally {
    bulkDeleting.value = false
  }
}

// --- CSV Export ---
function exportCSV() {
  const rows = selectedRows.value
  const header = ['id', 'name', 'category', 'unit', 'price', 'stock']
  const lines = rows.map((p) =>
    [p.id, p.name, p.category ?? '', p.unit, p.price, p.stock]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'inventaris.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// --- Stock badge ---
function stockBadgeVariant(stock: number) {
  if (stock === 0) return 'destructive'
  if (stock <= 5) return 'secondary'
  return 'outline'
}
</script>

<template>
  <!-- Skeleton loader -->
  <div v-if="loading" class="flex flex-col gap-3">
    <Skeleton v-for="i in 6" :key="i" class="h-12 w-full" />
  </div>

  <template v-else>
    <!-- Filter bar -->
    <div class="flex flex-wrap gap-3 mb-4">
      <Input
        v-model="nameFilter"
        placeholder="Cari nama produk..."
        class="h-11 text-base max-w-xs"
      />

      <Select v-model="categoryFilter">
        <SelectTrigger class="h-11 text-base w-48">
          <SelectValue placeholder="Semua Kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" class="text-base">Semua Kategori</SelectItem>
          <SelectItem
            v-for="cat in categories"
            :key="cat"
            :value="cat"
            class="text-base"
          >
            {{ cat }}
          </SelectItem>
        </SelectContent>
      </Select>

      <ToggleGroup v-model="stockFilter" type="single" variant="outline">
        <ToggleGroupItem value="all" class="h-11 text-base px-4">Semua</ToggleGroupItem>
        <ToggleGroupItem value="in" class="h-11 text-base px-4">Ada Stok</ToggleGroupItem>
        <ToggleGroupItem value="out" class="h-11 text-base px-4">Habis</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <!-- Bulk action toolbar -->
    <div v-if="selectedCount > 0" class="flex items-center gap-3 mb-3 p-3 bg-muted">
      <span class="text-base font-medium flex-1">{{ selectedCount }} produk dipilih</span>
      <Button variant="outline" class="h-10 text-base" @click="exportCSV">
        <IconFileExport data-icon="inline-start" />
        Ekspor CSV
      </Button>
      <Button variant="destructive" class="h-10 text-base" @click="showBulkDeleteDialog = true">
        <IconTrash data-icon="inline-start" />
        Hapus {{ selectedCount }} Produk
      </Button>
    </div>

    <!-- Table -->
    <div class="border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :class="[
                'text-base font-semibold',
                header.column.id === 'category' || header.column.id === 'unit'
                  ? 'hidden sm:table-cell'
                  : '',
                header.column.id === 'actions' ? 'text-right' : '',
              ]"
            >
              <template v-if="!header.isPlaceholder">
                <button
                  v-if="header.column.getCanSort()"
                  class="flex items-center gap-1 hover:text-foreground"
                  @click="header.column.toggleSorting()"
                >
                  {{ header.column.columnDef.header as string }}
                  <IconChevronUp v-if="header.column.getIsSorted() === 'asc'" class="size-3.5" />
                  <IconChevronDown v-else-if="header.column.getIsSorted() === 'desc'" class="size-3.5" />
                  <IconSelector v-else class="size-3.5 opacity-40" />
                </button>
                <FlexRender
                  v-else
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </template>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <template v-if="table.getRowModel().rows.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                :class="[
                  'text-base',
                  cell.column.id === 'category' || cell.column.id === 'unit'
                    ? 'hidden sm:table-cell'
                    : '',
                  cell.column.id === 'actions' ? 'text-right' : '',
                ]"
              >
                <!-- Custom renders -->
                <template v-if="cell.column.id === 'stock'">
                  <Badge
                    :variant="stockBadgeVariant(row.original.stock)"
                    class="h-7 px-2.5 text-sm"
                  >
                    {{ row.original.stock }}
                  </Badge>
                </template>

                <template v-else-if="cell.column.id === 'actions'">
                  <div class="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-10 text-base"
                      @click="emit('edit', row.original)"
                    >
                      <IconPencil data-icon="inline-start" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      class="h-10 text-base"
                      @click="emit('delete', row.original)"
                    >
                      <IconTrash data-icon="inline-start" />
                      Hapus
                    </Button>
                  </div>
                </template>

                <FlexRender
                  v-else
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </TableCell>
            </TableRow>
          </template>

          <TableRow v-else>
            <TableCell :colspan="columns.length" class="text-center text-base py-10 text-muted-foreground">
              Tidak ada produk ditemukan
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-3 gap-4 flex-wrap">
      <p class="text-sm text-muted-foreground">
        {{ table.getFilteredRowModel().rows.length }} dari {{ products.length }} produk
      </p>
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground whitespace-nowrap">
          Halaman {{ table.getState().pagination.pageIndex + 1 }} dari {{ table.getPageCount() }}
        </span>
        <Button
          variant="outline"
          size="icon-lg"
          :disabled="!table.getCanPreviousPage()"
          @click="table.previousPage()"
        >
          <IconChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-lg"
          :disabled="!table.getCanNextPage()"
          @click="table.nextPage()"
        >
          <IconChevronRight />
        </Button>
      </div>
    </div>
  </template>

  <!-- Bulk delete confirmation -->
  <AlertDialog :open="showBulkDeleteDialog" @update:open="(v) => !v && (showBulkDeleteDialog = false)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle class="text-2xl">Hapus {{ selectedCount }} Produk?</AlertDialogTitle>
        <AlertDialogDescription class="text-lg">
          Semua produk yang dipilih akan dihapus secara permanen dan tidak bisa dikembalikan.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="h-12 text-lg" :disabled="bulkDeleting">Batal</AlertDialogCancel>
        <AlertDialogAction class="h-12 text-lg" :disabled="bulkDeleting" @click="confirmBulkDelete">
          <Spinner v-if="bulkDeleting" data-icon="inline-start" />
          Ya, Hapus Semua
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
