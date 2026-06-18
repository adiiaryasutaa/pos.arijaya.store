// Redirect guard only. Reads the reactive session user (no network round-trip on every
// navigation, unlike auth.getUser()). Actual data access is still enforced server-side by
// RLS and the auth.uid() checks inside the create_transaction RPC, so a stale client
// session cannot read or write anything it shouldn't.
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }
})
