import { type FontSize } from '@/composables/useSettings'

const SETTINGS_STORAGE_KEY = 'pos-settings'

function applyFontSize(size: FontSize) {
  const html = document.documentElement
  html.classList.remove('font-kecil', 'font-sedang', 'font-besar')
  html.classList.add(`font-${size}`)
}

export default defineNuxtPlugin((nuxtApp) => {
  const settings = useState('settings', () => ({
    storeName: 'Toko Arijaya',
    fontSize: 'sedang' as FontSize,
  }))

  nuxtApp.hook('app:mounted', () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (raw) Object.assign(settings.value, JSON.parse(raw))
    } catch {
      // corrupt/unavailable storage — use defaults
    }

    applyFontSize(settings.value.fontSize)

    watch(
      () => settings.value.fontSize,
      (size) => applyFontSize(size),
    )

    watch(
      settings,
      (val) => {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(val))
        } catch {
          // quota exceeded or private mode — non-fatal
        }
      },
      { deep: true },
    )
  })
})
