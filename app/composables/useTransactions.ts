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
    paymentMethod: 'cash' | 'transfer',
    userId: string
  ): Promise<Transaction> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const total = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

    const { data: tx, error: txError } = await sb
      .from('transactions')
      .insert({ payment_method: paymentMethod, total, user_id: userId })
      .select()
      .single()

    if (txError) throw txError

    const items = cartItems.map(i => ({
      transaction_id: tx.id,
      product_id: i.product.id,
      product_name: i.product.name,
      product_price: i.product.price,
      quantity: i.quantity,
      subtotal: i.product.price * i.quantity,
    }))

    const { error: itemsError } = await sb.from('transaction_items').insert(items)
    if (itemsError) throw itemsError

    for (const item of cartItems) {
      await sb
        .from('products')
        .update({ stock: item.product.stock - item.quantity })
        .eq('id', item.product.id)
    }

    return { ...tx, transaction_items: items } as Transaction
  }

  return { fetchTransactions, createTransaction }
}
