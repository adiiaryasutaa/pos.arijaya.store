import type { Product } from './useProducts'

export interface CartItem {
  product: Product
  quantity: number
}

export function useCart() {
  const items = useState<CartItem[]>('cart', () => [])

  function addItem(product: Product) {
    const existing = items.value.find(i => i.product.id === product.id)
    if (existing) {
      if (existing.quantity < product.stock) {
        existing.quantity++
      }
    } else {
      if (product.stock > 0) {
        items.value.push({ product, quantity: 1 })
      }
    }
  }

  function removeItem(productId: string) {
    items.value = items.value.filter(i => i.product.id !== productId)
  }

  function updateQuantity(productId: string, quantity: number) {
    const item = items.value.find(i => i.product.id === productId)
    if (!item) return
    if (quantity <= 0) {
      removeItem(productId)
    } else if (quantity <= item.product.stock) {
      item.quantity = quantity
    }
  }

  function clearCart() {
    items.value = []
  }

  const total = computed(() =>
    items.value.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  )

  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0)
  )

  return { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }
}
