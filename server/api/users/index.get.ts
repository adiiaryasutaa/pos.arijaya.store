import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    role: (u.app_metadata as { role?: string })?.role === 'admin' ? 'admin' : 'kasir',
    full_name: (u.user_metadata as { full_name?: string })?.full_name ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }))
})
