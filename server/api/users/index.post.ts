import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)

  const email = body?.email
  const password = body?.password
  const role = body?.role
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''

  if (!isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email tidak valid' })
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password minimal 8 karakter' })
  }
  if (!isValidRole(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Peran tidak valid' })
  }
  if (!fullName) {
    throw createError({ statusCode: 400, statusMessage: 'Nama wajib diisi' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  })
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { id: data.user.id }
})
