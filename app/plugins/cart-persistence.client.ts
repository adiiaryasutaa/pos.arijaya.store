import type { CartItem } from '@/composables/useCart'
import { CART_STORAGE_KEY } from '@/composables/useCart'

// Persist the cart across reloads so an accidental refresh never wipes an in-progress
// sale. Hydration runs on `app:mounted` (after Vue hydration) so the restored cart
// never causes a server/client markup mismatch. The watcher then mirrors every change
// back to localStorage for the lifetime of the app.
export default defineNuxtPlugin((nuxtApp) => {
  const items = useState<CartItem[]>('cart', () => [])

  nuxtApp.hook('app:mounted', () => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (raw) items.value = JSON.parse(raw)
    } catch {
      // corrupt/unavailable storage — start with an empty cart
    }

    watch(items, (val) => {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(val))
      } catch {
        // quota exceeded or private mode — non-fatal
      }
    }, { deep: true })
  })
})
