export type Role = 'admin' | 'kasir'

export interface AppUser {
  id: string
  email: string
  role: Role
  full_name: string | null
  created_at: string
  last_sign_in_at: string | null
}

export interface UserInput {
  email: string
  password?: string
  role: Role
  full_name: string
}

export function useUsers() {
  async function fetchUsers(): Promise<AppUser[]> {
    return $fetch<AppUser[]>('/api/users')
  }

  async function createUser(input: UserInput): Promise<void> {
    await $fetch('/api/users', { method: 'POST', body: input })
  }

  async function updateUser(id: string, input: Partial<UserInput>): Promise<void> {
    await $fetch(`/api/users/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteUser(id: string): Promise<void> {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
  }

  return { fetchUsers, createUser, updateUser, deleteUser }
}
