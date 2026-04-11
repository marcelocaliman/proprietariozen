'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { NotificacoesConfig } from './types'

// ── Perfil ────────────────────────────────────────────────────────────────────

export async function atualizarPerfil(input: {
  nome: string
  telefone: string | null
  cpf: string | null
  nome_recibo: string | null
}): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('profiles')
    .update({
      nome: input.nome,
      telefone: input.telefone || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

// ── Avatar / foto de perfil ───────────────────────────────────────────────────

export async function obterUrlUploadAvatar(): Promise<{ url?: string; path?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const path = `avatars/${user.id}/avatar.jpg`

  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUploadUrl(path)

  if (error) return { error: error.message }
  return { url: data.signedUrl, path }
}

export async function salvarFotoPerfilUrl(publicUrl: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

// ── Notificações ──────────────────────────────────────────────────────────────

export async function salvarNotificacoes(
  config: NotificacoesConfig,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Armazena o JSON nos metadados do usuário como fallback MVP
  // TODO: migrar para coluna jsonb `notificacoes_config` na tabela profiles
  const { error } = await supabase.auth.updateUser({
    data: { notificacoes_config: config },
  })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

// ── Segurança — alterar senha ─────────────────────────────────────────────────

export async function alterarSenha(novaSenha: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { error: error.message }
  return {}
}

// ── Segurança — encerrar outras sessões ───────────────────────────────────────

export async function encerrarOutrasSessoes(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) return { error: error.message }
  return {}
}

// ── Exportar dados ────────────────────────────────────────────────────────────

export async function exportarDados(): Promise<{
  dados?: {
    perfil: unknown
    imoveis: unknown[]
    inquilinos: unknown[]
    alugueis: unknown[]
  }
  error?: string
}> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const [
    { data: perfil },
    { data: imoveis },
    { data: inquilinos },
    { data: alugueis },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('imoveis').select('*').eq('user_id', user.id),
    supabase.from('inquilinos').select('*').eq('user_id', user.id),
    supabase
      .from('alugueis')
      .select('*, imoveis!inner(user_id)')
      .eq('imoveis.user_id', user.id),
  ])

  return {
    dados: {
      perfil,
      imoveis: imoveis ?? [],
      inquilinos: inquilinos ?? [],
      alugueis: alugueis ?? [],
    },
  }
}

// ── Excluir conta ─────────────────────────────────────────────────────────────

export async function excluirConta(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error: deleteError } = await supabase
    .from('imoveis')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) return { error: deleteError.message }

  await supabase.auth.signOut()

  // TODO (Semana 3): cancelar assinatura Stripe ativa antes de deletar
  // if (profile.stripe_customer_id) {
  //   await stripe.subscriptions.cancel(subscriptionId)
  // }

  return {}
}
