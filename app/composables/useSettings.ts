export type FontSize = 'kecil' | 'sedang' | 'besar'

interface Settings {
  storeName: string
  fontSize: FontSize
}

export function useSettings() {
  const settings = useState<Settings>('settings', () => ({
    storeName: 'Toko Arijaya',
    fontSize: 'sedang',
  }))

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const userId = computed(() => user.value?.id ?? (user.value as any)?.sub)

  const storeName = computed({
    get: () => settings.value.storeName,
    set: (v) => {
      settings.value.storeName = v
    },
  })

  const fontSize = computed({
    get: () => settings.value.fontSize,
    set: (v) => {
      settings.value.fontSize = v
    },
  })

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

    if (configResult.error) console.error('[useSettings] loadSettings:', configResult.error)
    if (prefsResult.error) console.error('[useSettings] loadSettings (prefs):', prefsResult.error)

    if (configResult.data) {
      settings.value.storeName = configResult.data.store_name
    }
    if (prefsResult.data) {
      settings.value.fontSize = prefsResult.data.font_size as FontSize
    }

    return null
  }

  async function saveStoreName(name: string) {
    const { error } = await supabase
      .from('store_config')
      .update({ store_name: name })
      .eq('id', 1)
    if (!error) settings.value.storeName = name
    return { error }
  }

  async function saveFontSize(size: FontSize) {
    if (!userId.value) {
      console.error('[useSettings] saveFontSize: no user id', user.value)
      return { error: new Error('Not authenticated') }
    }
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId.value, font_size: size })
    if (error) console.error('[useSettings] saveFontSize:', error)
    if (!error) settings.value.fontSize = size
    return { error }
  }

  return { settings, storeName, fontSize, loadSettings, saveStoreName, saveFontSize }
}
