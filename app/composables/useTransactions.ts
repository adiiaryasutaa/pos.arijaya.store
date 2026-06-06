import type { CartItem } from './useCart'

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  subtotal: number
}

export interface Transaction {
  id: string
  payment_method: 'cash' | 'transfer'
  total: number
  note: string | null
  created_at: string
  user_id: string
  transaction_items: TransactionItem[]
}

export function useTransactions() {
  const supabase = useSupabaseClient()

  async function fetchTransactions(from?: string, to?: string): Promise<Transaction[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    let query = sb
      .from('transactions')
      .select('*, transaction_items(*)')
      .order('created_at', { ascending: false })

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, error } = await query
    if (error) throw error
    return data as Transaction[]
  }

  async function createTransaction(
    cartItems: CartItem[],
    paymentMethod: 'cash' | 'transfer'
  ): Promise<Transaction> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const items = cartItems.map(i => ({
      product_id: i.product.id,
      product_name: i.product.name,
      product_price: i.product.price,
      quantity: i.quantity,
    }))

    const { data, error } = await sb.rpc('create_transaction', {
      p_payment_method: paymentMethod,
      p_items: items,
    })

    if (error) throw error
    return data as Transaction
  }

  return { fetchTransactions, createTransaction }
}
