import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Guards an API route so only admins can proceed. The real security boundary —
 * client middleware is bypassable, this is not. Returns the calling admin user
 * (callers need user.id for self-protection checks).
 */
export async function requireAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Tidak terautentikasi' })
  }

  if ((user.app_metadata as { role?: string })?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
  }

  return user
}

const VALID_ROLES = ['admin', 'kasir'] as const
export type Role = (typeof VALID_ROLES)[number]

export function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role)
}

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
