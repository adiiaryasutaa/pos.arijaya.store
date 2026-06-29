<script setup lang="ts">
import {
  FlexRender,
  createColumnHelper,
  getCoreRowModel,
  useVueTable,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/vue-table'
import { IconPencil, IconTrash, IconChevronUp, IconChevronDown, IconSelector, IconFileExport, IconChevronLeft, IconChevronRight, IconPlus, IconPackage, IconFilterOff, IconRefresh } from '@tabler/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import type { Product, ProductSortId } from '@/composables/useProducts'
import { valueUpdater } from '@/components/ui/table/utils'

const emit = defineEmits<{
  edit: [product: Product]
  delete: [product: Product]
  add: []
}>()

const { formatIDR } = useCurrency()
const { fetchProductPage, fetchCategories, deleteProduct } = useProducts()

// --- Filters (server-side) ---
const nameFilter = ref('')
const categoryFilter = ref('__all__')
const stockFilter = ref<'all' | 'in' | 'out'>('all')
const categories = ref<string[]>([])

// "Truly empty" vs "filtered to nothing" — only the former offers a create button.
const hasActiveFilters = computed(() =>
  nameFilter.value.trim() !== '' || categoryFilter.value !== '__all__' || stockFilter.value !== 'all',
)

// --- TanStack table state (manual mode: Postgres does filter/sort/paginate) ---
const sorting = ref<SortingState>([])
const rowSelection = ref<RowSelectionState>({})
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 })

// --- Server-fetched page ---
const data = ref<Product[]>([])
const total = ref(0)
const loading = ref(true)

// --- URL sync: hydrate state from the query string on first load. Runs before the
// watchers below are attached, so seeding these refs doesn't trigger a refetch. ---
const route = useRoute()
const router = useRouter()
const qs = route.query
const qStr = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined

nameFilter.value = qStr(qs.q) ?? ''
categoryFilter.value = qStr(qs.cat) ?? '__all__'
const stockQ = qStr(qs.stock)
stockFilter.value = stockQ === 'in' || stockQ === 'out' ? stockQ : 'all'
const pageQ = Number(qStr(qs.page))
pagination.value.pageIndex = Number.isFinite(pageQ) && pageQ > 1 ? pageQ - 1 : 0
const sortQ = qStr(qs.sort)
if (sortQ) sorting.value = [{ id: sortQ, desc: qStr(qs.dir) === 'desc' }]

function syncUrl() {
  const q: Record<string, string> = {}
  if (nameFilter.value.trim()) q.q = nameFilter.value.trim()
  if (categoryFilter.value !== '__all__') q.cat = categoryFilter.value
  if (stockFilter.value !== 'all') q.stock = stockFilter.value
  if (pagination.value.pageIndex > 0) q.page = String(pagination.value.pageIndex + 1)
  const s = sorting.value[0]
  if (s) {
    q.sort = s.id
    if (s.desc) q.dir = 'desc'
  }
  // replace (not push) so filtering doesn't flood the back-button history.
  router.replace({ query: q })
}

async function loadPage() {
  loading.value = true
  try {
    const s = sorting.value[0]
    const res = await fetchProductPage({
      page: pagination.value.pageIndex,
      pageSize: pagination.value.pageSize,
      name: nameFilter.value,
      category: categoryFilter.value,
      stock: stockFilter.value,
      sortId: s?.id as ProductSortId | undefined,
      sortDesc: s?.desc,
    })
    data.value = res.rows
    total.value = res.total
    rowSelection.value = {} // selection is per-page; clear on every fetch
  } catch {
    toast.error('Gagal memuat produk')
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await fetchCategories()
  } catch {
    // Non-fatal: filter dropdown simply stays empty.
  }
}

// Exposed so the parent page can refresh after create/update/delete.
async function reload() {
  await Promise.all([loadPage(), loadCategories()])
}
defineExpose({ reload })

// Reset all filters to defaults. The category/stock watcher resets to page 1 and
// refetches; nameFilter's debounced watcher fires too, so this settles on one page.
function resetFilters() {
  nameFilter.value = ''
  categoryFilter.value = '__all__'
  stockFilter.value = 'all'
}

// Filter changes reset to the first page then refetch. Name is debounced to avoid
// a query per keystroke. Setting pageIndex directly (not via the table) won't fire
// onPaginationChange, so there's no double fetch.
const onNameInput = useDebounceFn(() => {
  pagination.value.pageIndex = 0
  loadPage()
}, 300)
watch(nameFilter, onNameInput)
watch([categoryFilter, stockFilter], () => {
  pagination.value.pageIndex = 0
  loadPage()
})

// Mirror every filter/sort/page change into the URL query string.
watch(
  [nameFilter, categoryFilter, stockFilter, () => pagination.value.pageIndex, sorting],
  syncUrl,
  { deep: true },
)

onMounted(() => {
  loadPage()
  loadCategories()
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
  get data() { return data.value },
  columns,
  state: {
    get sorting() { return sorting.value },
    get rowSelection() { return rowSelection.value },
    get pagination() { return pagination.value },
  },
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  get rowCount() { return total.value },
  enableRowSelection: true,
  getRowId: (row) => row.id,
  // Sort change resets to page 1 then refetches; page change just refetches.
  onSortingChange: (u) => {
    valueUpdater(u, sorting)
    pagination.value.pageIndex = 0
    loadPage()
  },
  onRowSelectionChange: (u) => valueUpdater(u, rowSelection),
  onPaginationChange: (u) => {
    valueUpdater(u, pagination)
    loadPage()
  },
  getCoreRowModel: getCoreRowModel(),
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
    await reload()
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
  <div>
    <!-- Filter bar (stays visible while data loads) -->
    <div class="flex flex-wrap gap-3 mb-4">
      <Input
        v-model="nameFilter"
        placeholder="Cari nama produk..."
        class="h-11 text-base w-full sm:max-w-xs"
      />

      <Select v-model="categoryFilter">
        <SelectTrigger class="h-11 text-base w-full sm:w-48">
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
        <ToggleGroupItem value="in" class="h-11 text-base px-4">Tersedia</ToggleGroupItem>
        <ToggleGroupItem value="out" class="h-11 text-base px-4">Habis</ToggleGroupItem>
      </ToggleGroup>

      <Button
        variant="outline"
        class="h-11 text-base gap-2 ml-auto"
        :disabled="!hasActiveFilters"
        @click="resetFilters"
      >
        <IconFilterOff data-icon="inline-start" />
        <span class="hidden sm:inline">Reset Filter</span>
      </Button>

      <Button
        variant="outline"
        size="icon-lg"
        class="h-11 w-11"
        :disabled="loading"
        aria-label="Muat ulang"
        @click="reload"
      >
        <IconRefresh :class="loading ? 'animate-spin' : ''" />
      </Button>
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
    <div class="rounded-md border overflow-x-auto md:min-h-[40rem]">
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
          <TableRow v-if="loading">
            <TableCell :colspan="columns.length" class="text-center py-10">
              <Spinner class="mx-auto size-6" />
            </TableCell>
          </TableRow>

          <template v-else-if="table.getRowModel().rows.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
              class="h-14"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                :class="[
                  'text-base whitespace-nowrap',
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
                      <span class="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      class="h-10 text-base"
                      @click="emit('delete', row.original)"
                    >
                      <IconTrash data-icon="inline-start" />
                      <span class="hidden sm:inline">Hapus</span>
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
            <TableCell :colspan="columns.length" class="py-10">
              <Empty class="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconPackage class="size-6" />
                  </EmptyMedia>
                  <EmptyTitle class="text-2xl">
                    {{ hasActiveFilters ? 'Tidak ada hasil' : 'Belum ada produk' }}
                  </EmptyTitle>
                  <EmptyDescription class="text-lg">
                    {{ hasActiveFilters ? 'Tidak ada produk yang cocok dengan filter' : 'Tambahkan produk pertama Anda' }}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent v-if="!hasActiveFilters">
                  <Button class="h-12 text-lg gap-2" @click="emit('add')">
                    <IconPlus data-icon="inline-start" />
                    Tambah Produk
                  </Button>
                </EmptyContent>
              </Empty>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-3 gap-4 flex-wrap">
      <p class="text-sm text-muted-foreground">
        {{ total }} produk
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
  </div>

  <!-- Bulk delete confirmation -->
  <AlertDialog :open="showBulkDeleteDialog" @update:open="(v) => !v && (showBulkDeleteDialog = false)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogMedia class="bg-destructive/10 text-destructive">
          <IconTrash />
        </AlertDialogMedia>
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
