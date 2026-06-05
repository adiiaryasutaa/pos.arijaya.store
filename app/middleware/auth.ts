export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (session && to.path === '/login') {
    return navigateTo('/')
  }
})
