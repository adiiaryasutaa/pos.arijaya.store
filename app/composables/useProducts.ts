import type { Database } from '@/types/database.types'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>

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

  return { fetchProducts, createProduct, updateProduct, deleteProduct }
}
