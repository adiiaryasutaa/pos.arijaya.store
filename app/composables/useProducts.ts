import type { Database } from '@/types/database.types'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>

export type ProductSortId = 'name' | 'category' | 'price' | 'stock'

export interface ProductQuery {
  page: number
  pageSize: number
  name?: string
  category?: string // '__all__' or undefined = all categories
  stock?: 'all' | 'in' | 'out'
  sortId?: ProductSortId
  sortDesc?: boolean
}

export interface ProductPage {
  rows: Product[]
  total: number
}

export function useProducts() {
  const supabase = useSupabaseClient<Database>()

  async function fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  }

  // Server-side paginated page with filtering + sorting applied in Postgres.
  // Uses an exact count so the table can compute total pages without loading all rows.
  async function fetchProductPage(q: ProductQuery): Promise<ProductPage> {
    const from = q.page * q.pageSize
    const to = from + q.pageSize - 1

    let query = supabase.from('products').select('*', { count: 'exact' })

    if (q.name?.trim()) query = query.ilike('name', `%${q.name.trim()}%`)
    if (q.category && q.category !== '__all__') query = query.eq('category', q.category)
    if (q.stock === 'in') query = query.gt('stock', 0)
    if (q.stock === 'out') query = query.eq('stock', 0)

    // Default sort: name ascending. An explicit sort overrides it.
    query = query.order(q.sortId ?? 'name', { ascending: q.sortId ? !q.sortDesc : true })
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { rows: (data ?? []) as Product[], total: count ?? 0 }
  }

  // Distinct non-null categories for the filter dropdown. Single-column select
  // (deduped client-side) — light enough at single-shop scale.
  async function fetchCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)
    if (error) throw error
    const cats = (data ?? []).map(r => r.category).filter((c): c is string => !!c)
    return [...new Set(cats)].sort()
  }

  async function createProduct(input: ProductInput): Promise<void> {
    const { error } = await supabase.from('products').insert(input)
    if (error) throw error
  }

  async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
    const { error } = await supabase.from('products').update(input).eq('id', id)
    if (error) throw error
  }

  async function deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  }

  return { fetchProducts, fetchProductPage, fetchCategories, createProduct, updateProduct, deleteProduct }
}
