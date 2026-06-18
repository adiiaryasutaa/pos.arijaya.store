// TODO: switch to useSupabaseClient<Database>() after running pnpm db:types

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

  // TODO: switch to useSupabaseClient<Database>() after running pnpm db:types
  const supabase = useSupabaseClient<any>()
  const user = useSupabaseUser()

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
      user.value
        ? supabase
            .from('user_preferences')
            .select('font_size')
            .eq('user_id', user.value.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (configResult.data) {
      settings.value.storeName = configResult.data.store_name
    }
    if (prefsResult.data) {
      settings.value.fontSize = prefsResult.data.font_size as FontSize
    }
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
    if (!user.value) return { error: new Error('Not authenticated') }
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.value.id, font_size: size })
    if (!error) settings.value.fontSize = size
    return { error }
  }

  return { settings, storeName, fontSize, loadSettings, saveStoreName, saveFontSize }
}
