import type { CartItem } from '@/stores/cart'
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

// Filters shared by the list and the summary so both always describe the same set.
// `idFilter` carries the result of a product-name search (transaction ids); an empty
// array means "search ran but matched nothing" and must yield an empty result.
export interface TxFilters {
  from?: string
  to?: string
  paymentMethod?: 'cash' | 'transfer'
  minTotal?: number
  maxTotal?: number
  cashierId?: string
  idFilter?: string[]
}

export function useTransactions() {
  const supabase = useSupabaseClient<Database>()

  // Resolves a product-name query to the distinct transaction ids whose items match.
  // Kept separate (rather than an inner join) so the fetched transactions keep their
  // full item lists. Returns [] when the query matches no items.
  async function resolveProductIds(q: string): Promise<string[]> {
    const term = q.trim()
    if (!term) return []
    const { data, error } = await supabase
      .from('transaction_items')
      .select('transaction_id')
      .ilike('product_name', `%${term}%`)
    if (error) throw error
    return [...new Set((data ?? []).map(r => r.transaction_id))]
  }

  // Applies the shared filters to a transactions query builder.
  function applyFilters<T>(query: T, f: TxFilters): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = query as any
    if (f.from) q = q.gte('created_at', f.from)
    if (f.to) q = q.lte('created_at', f.to)
    if (f.paymentMethod) q = q.eq('payment_method', f.paymentMethod)
    if (f.minTotal != null) q = q.gte('total', f.minTotal)
    if (f.maxTotal != null) q = q.lte('total', f.maxTotal)
    if (f.cashierId) q = q.eq('user_id', f.cashierId)
    if (f.idFilter) q = q.in('id', f.idFilter)
    return q as T
  }

  // Paginated list with nested items. Fetches one extra row to detect `hasMore`
  // without a separate count query.
  async function fetchTransactions(
    opts: TxFilters & { offset?: number, limit?: number } = {},
  ): Promise<TransactionPage> {
    const { offset = 0, limit = TRANSACTIONS_PAGE_SIZE, ...filters } = opts

    // A product search that matched nothing → empty page, skip the query.
    if (filters.idFilter && filters.idFilter.length === 0) {
      return { rows: [], hasMore: false }
    }

    let query = supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .order('created_at', { ascending: false })

    query = applyFilters(query, filters)
    query = query.range(offset, offset + limit) // +1 sentinel row

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as unknown as Transaction[]
    const hasMore = rows.length > limit
    return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore }
  }

  // Accurate count + revenue over the whole filtered set, independent of pagination.
  // Selects only the `total` column (no nested items) to keep the payload light.
  async function fetchSummary(filters: TxFilters = {}): Promise<TransactionSummary> {
    if (filters.idFilter && filters.idFilter.length === 0) {
      return { count: 0, total: 0 }
    }

    let query = supabase
      .from('transactions')
      .select('total', { count: 'exact' })

    query = applyFilters(query, filters)

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

  return { fetchTransactions, fetchSummary, resolveProductIds, createTransaction }
}
