// Client redirect guard for admin-only pages. The real enforcement is server-side
// (server/api/users/* call requireAdmin), so a bypassed client check leaks nothing —
// this just keeps non-admins from landing on a page they can't use.
export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()

  if ((user.value?.app_metadata as { role?: string })?.role !== 'admin') {
    return navigateTo('/')
  }
})
