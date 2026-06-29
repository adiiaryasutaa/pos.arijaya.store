import { serverSupabaseServiceRole } from '#supabase/server'

interface UserUpdates {
  email?: string
  password?: string
  app_metadata?: { role: string }
  user_metadata?: { full_name: string }
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })
  }

  const body = await readBody(event)
  const updates: UserUpdates = {}

  if (body?.email !== undefined) {
    if (!isValidEmail(body.email)) {
      throw createError({ statusCode: 400, statusMessage: 'Email tidak valid' })
    }
    updates.email = body.email
  }

  // Password is optional on edit — only set when a non-empty value is sent.
  if (body?.password !== undefined && body.password !== '') {
    if (typeof body.password !== 'string' || body.password.length < 8) {
      throw createError({ statusCode: 400, statusMessage: 'Password minimal 8 karakter' })
    }
    updates.password = body.password
  }

  if (body?.role !== undefined) {
    if (!isValidRole(body.role)) {
      throw createError({ statusCode: 400, statusMessage: 'Peran tidak valid' })
    }
    // Self-protection: an admin must not demote their own account (lockout risk).
    if (id === admin.id && body.role !== 'admin') {
      throw createError({ statusCode: 400, statusMessage: 'Tidak dapat menurunkan peran sendiri' })
    }
    updates.app_metadata = { role: body.role }
  }

  if (body?.full_name !== undefined) {
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    if (!fullName) {
      throw createError({ statusCode: 400, statusMessage: 'Nama wajib diisi' })
    }
    updates.user_metadata = { full_name: fullName }
  }

  const client = serverSupabaseServiceRole(event)
  const { error } = await client.auth.admin.updateUserById(id, updates)
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { ok: true }
})
