'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import type { NotificacoesConfig } from './types'

// ── Perfil ────────────────────────────────────────────────────────────────────

export async function atualizarPerfil(input: {
  nome: string
  telefone: string | null
  cpf: string | null
  nome_recibo: string | null
  pix_key?: string | null
  pix_key_tipo?: string | null
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

  // Salva chave PIX nos metadados do usuário (sem necessidade de coluna no DB)
  if ('pix_key' in input) {
    const { error: authError } = await supabase.auth.updateUser({
      data: { pix_key: input.pix_key ?? null, pix_key_tipo: input.pix_key_tipo ?? null },
    })
    if (authError) return { error: authError.message }
  }

  revalidatePath('/configuracoes')
  return {}
}

// ── Avatar / foto de perfil ───────────────────────────────────────────────────

export async function obterUrlUploadAvatar(): Promise<{ url?: string; path?: string; error?: string }> {
  // Verifica autenticação com o client normal
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Usa o admin client para bypassar as RLS do Storage
  // (policies de INSERT no bucket avatars não precisam existir)
  const admin = createAdminClient()
  const objectPath = `${user.id}/avatar.jpg`

  // Garante que o bucket existe (idempotente — ignora erro de duplicata)
  await admin.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })

  const { data, error } = await admin.storage
    .from('avatars')
    .createSignedUploadUrl(objectPath)

  if (error) return { error: error.message }
  return { url: data.signedUrl, path: objectPath }
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

// ── Cancelamento de assinatura inline ────────────────────────────────────────
// Marca cancel_at_period_end=true no Stripe (usuário mantém acesso até o fim
// do período pago). Usado pra evitar redirect pro Customer Portal.
export async function cancelarAssinaturaStripe(): Promise<{
  error?: string
  current_period_end?: string | null
}> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    return { error: 'Nenhuma assinatura ativa encontrada.' }
  }
  if (profile.stripe_subscription_status === 'canceled') {
    return { error: 'Assinatura já foi cancelada.' }
  }

  try {
    const stripe = getStripe()
    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Atualiza o DB localmente — webhook vai chegar e confirmar.
    const periodEndUnix =
      (updated as unknown as { current_period_end?: number }).current_period_end
      ?? (updated.items.data[0] as unknown as { current_period_end?: number })?.current_period_end
    const periodEndIso = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null

    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({
        stripe_subscription_cancel_at_period_end: true,
        stripe_subscription_current_period_end: periodEndIso,
      })
      .eq('id', user.id)

    revalidatePath('/configuracoes')
    return { current_period_end: periodEndIso }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao cancelar assinatura.' }
  }
}

// Reativa uma assinatura que foi marcada para cancelar ao fim do período.
export async function reativarAssinaturaStripe(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    return { error: 'Nenhuma assinatura encontrada.' }
  }

  try {
    const stripe = getStripe()
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({ stripe_subscription_cancel_at_period_end: false })
      .eq('id', user.id)

    revalidatePath('/configuracoes')
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao reativar assinatura.' }
  }
}
