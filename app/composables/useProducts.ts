export interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string | null
  unit: string
  created_at: string
  updated_at: string
}

export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>

export function useProducts() {
  const supabase = useSupabaseClient()

  async function fetchProducts(): Promise<Product[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('products')
      .select('*')
      .order('name')
    if (error) throw error
    return data as Product[]
  }

  async function createProduct(input: ProductInput): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('products').insert(input)
    if (error) throw error
  }

  async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('products').update(input).eq('id', id)
    if (error) throw error
  }

  async function deleteProduct(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('products').delete().eq('id', id)
    if (error) throw error
  }

  async function decrementStock(id: string, qty: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('decrement_stock', { product_id: id, qty })
    if (error) throw error
  }

  return { fetchProducts, createProduct, updateProduct, deleteProduct, decrementStock }
}
