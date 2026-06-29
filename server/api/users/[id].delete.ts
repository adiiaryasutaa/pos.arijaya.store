import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })
  }

  // Self-protection: an admin must not delete their own account (lockout risk).
  if (id === admin.id) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak dapat menghapus akun sendiri' })
  }

  const client = serverSupabaseServiceRole(event)
  const { error } = await client.auth.admin.deleteUser(id)
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { ok: true }
})
