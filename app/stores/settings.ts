import type { Database } from '@/types/database.types'

export type FontSize = 'kecil' | 'sedang' | 'besar'

export const useSettingsStore = defineStore('settings', () => {
  const storeName = ref('Toko Arijaya')
  const fontSize = ref<FontSize>('sedang')

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const userId = computed(() => user.value?.id ?? (user.value as any)?.sub)

  async function loadSettings() {
    const [configResult, prefsResult] = await Promise.all([
      supabase.from('store_config').select('store_name').eq('id', 1).single(),
      userId.value
        ? supabase
            .from('user_preferences')
            .select('font_size')
            .eq('user_id', userId.value)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (configResult.error) console.error('[settings] loadSettings:', configResult.error)
    if (prefsResult.error) console.error('[settings] loadSettings (prefs):', prefsResult.error)

    if (configResult.data) {
      storeName.value = configResult.data.store_name
    }
    if (prefsResult.data) {
      fontSize.value = prefsResult.data.font_size as FontSize
    }

    return null
  }

  async function saveStoreName(name: string) {
    const { error } = await supabase
      .from('store_config')
      .update({ store_name: name })
      .eq('id', 1)
    if (!error) storeName.value = name
    return { error }
  }

  async function saveFontSize(size: FontSize) {
    if (!userId.value) {
      console.error('[settings] saveFontSize: no user id', user.value)
      return { error: new Error('Not authenticated') }
    }
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId.value, font_size: size })
    if (error) console.error('[settings] saveFontSize:', error)
    if (!error) fontSize.value = size
    return { error }
  }

  // Reset per-user preference to default (used before sign-out).
  function resetFontSize() {
    fontSize.value = 'sedang'
  }

  return { storeName, fontSize, loadSettings, saveStoreName, saveFontSize, resetFontSize }
})
