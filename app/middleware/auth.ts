export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (user && to.path === '/login') {
    return navigateTo('/')
  }
})
