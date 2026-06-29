// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt', '@nuxtjs/supabase', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  },
  supabase: {
    redirect: false
  }
})