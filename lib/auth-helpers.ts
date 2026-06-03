// Helpers de auth centralizados pra server actions e route handlers.
// Substitui o padrão repetido em ~86 lugares:
//   const supabase = await createServerSupabaseClient()
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) return { error: 'Não autorizado' }

import { createServerSupabaseClient } from './supabase-server'
import { isAdmin } from './admin'

type AuthResult =
  | { user: { id: string; email: string | null }; error?: never }
  | { user?: never; error: string }

// Server action helper: retorna user ou erro.
// Uso: const auth = await requireUser(); if ('error' in auth) return auth
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  return { user: { id: user.id, email: user.email ?? null } }
}

type AdminAuthResult =
  | { user: { id: string; email: string | null }; error?: never }
  | { user?: never; error: string }

// Server action helper: retorna user admin ou erro.
export async function requireAdmin(): Promise<AdminAuthResult> {
  const auth = await requireUser()
  if ('error' in auth) return auth
  const ok = await isAdmin(auth.user.id)
  if (!ok) return { error: 'Acesso negado.' }
  return auth
}
