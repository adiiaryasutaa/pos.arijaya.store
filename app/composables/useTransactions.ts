import type { CartItem } from './useCart'
import type { Database } from '@/types/database.types'

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
  amount_paid: number | null
  change_amount: number | null
  note: string | null
  created_at: string
  user_id: string | null
  transaction_items: TransactionItem[]
}

export interface TransactionPage {
  rows: Transaction[]
  hasMore: boolean
}

export interface TransactionSummary {
  count: number
  total: number
}

// Default page size for the history list. Large enough that a typical day fits in
// one page, small enough to keep the nested-items payload bounded.
export const TRANSACTIONS_PAGE_SIZE = 30

export function useTransactions() {
  const supabase = useSupabaseClient<Database>()

  // Paginated list with nested items. Fetches one extra row to detect `hasMore`
  // without a separate count query.
  async function fetchTransactions(
    opts: { from?: string, to?: string, offset?: number, limit?: number } = {},
  ): Promise<TransactionPage> {
    const { from, to, offset = 0, limit = TRANSACTIONS_PAGE_SIZE } = opts

    let query = supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .order('created_at', { ascending: false })

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    query = query.range(offset, offset + limit) // +1 sentinel row

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as unknown as Transaction[]
    const hasMore = rows.length > limit
    return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore }
  }

  // Accurate count + revenue over the whole filtered range, independent of pagination.
  // Selects only the `total` column (no nested items) to keep the payload light.
  async function fetchSummary(from?: string, to?: string): Promise<TransactionSummary> {
    let query = supabase
      .from('transactions')
      .select('total', { count: 'exact' })

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, error, count } = await query
    if (error) throw error

    const total = (data ?? []).reduce((sum, row) => sum + Number(row.total), 0)
    return { count: count ?? 0, total }
  }

  async function createTransaction(
    cartItems: CartItem[],
    paymentMethod: 'cash' | 'transfer',
    amountPaid?: number | null,
  ): Promise<Transaction> {
    const items = cartItems.map(i => ({
      product_id: i.product.id,
      product_name: i.product.name,
      product_price: i.product.price,
      quantity: i.quantity,
    }))

    const { data, error } = await supabase.rpc('create_transaction', {
      p_payment_method: paymentMethod,
      p_items: items,
      p_amount_paid: amountPaid ?? null,
    })

    if (error) throw error
    return data as unknown as Transaction
  }

  return { fetchTransactions, fetchSummary, createTransaction }
}
