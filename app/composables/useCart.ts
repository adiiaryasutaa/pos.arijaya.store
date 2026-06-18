import type { Product } from './useProducts'

export interface CartItem {
  product: Product
  quantity: number
}

// Result of a cart mutation so the page can give the user feedback instead of
// failing silently (important for elderly cashiers who otherwise see a dead tap).
export type CartResult = 'ok' | 'out_of_stock' | 'max_reached'

export const CART_STORAGE_KEY = 'pos-cart'

export function useCart() {
  // SSR-stable source of truth. Persistence to localStorage is wired in the
  // cart-persistence.client plugin (hydrates after mount to avoid hydration mismatch).
  const items = useState<CartItem[]>('cart', () => [])

  function addItem(product: Product): CartResult {
    if (product.stock <= 0) return 'out_of_stock'
    const existing = items.value.find(i => i.product.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) return 'max_reached'
      existing.quantity++
      return 'ok'
    }
    items.value.push({ product, quantity: 1 })
    return 'ok'
  }

  function removeItem(productId: string) {
    items.value = items.value.filter(i => i.product.id !== productId)
  }

  function updateQuantity(productId: string, quantity: number): CartResult {
    const item = items.value.find(i => i.product.id === productId)
    if (!item) return 'ok'
    if (quantity <= 0) {
      removeItem(productId)
      return 'ok'
    }
    if (quantity > item.product.stock) {
      item.quantity = item.product.stock
      return 'max_reached'
    }
    item.quantity = quantity
    return 'ok'
  }

  function clearCart() {
    items.value = []
  }

  // Reconcile a persisted cart against freshly-fetched products: drop items whose
  // product was deleted or is now out of stock, refresh the price/stock snapshot,
  // and clamp quantities that exceed current stock.
  function syncWithProducts(products: Product[]) {
    items.value = items.value.flatMap((item) => {
      const fresh = products.find(p => p.id === item.product.id)
      if (!fresh || fresh.stock <= 0) return []
      return [{ product: fresh, quantity: Math.min(item.quantity, fresh.stock) }]
    })
  }

  const total = computed(() =>
    items.value.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  )

  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0),
  )

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    syncWithProducts,
    total,
    itemCount,
  }
}
