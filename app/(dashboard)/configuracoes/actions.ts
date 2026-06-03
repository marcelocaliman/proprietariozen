'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseAdminAuthClient } from '@supabase/supabase-js'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { registrarLog } from '@/lib/log'
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

// ── LGPD: Exportar dados (direito de portabilidade) ─────────────────────────

export async function exportarDados(): Promise<{
  dados?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const admin = createAdminClient()

  const [
    { data: profile },
    { data: imoveis },
    { data: inquilinos },
    { data: alugueis },
    { data: tokens },
    { data: docsImovel },
    { data: docsAluguel },
    { data: docsInquilino },
    { data: tickets },
    { data: ticketMensagens },
    { data: notificacoes },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).single(),
    admin.from('imoveis').select('*').eq('user_id', user.id),
    admin.from('inquilinos').select('*').eq('user_id', user.id),
    admin.from('alugueis').select('*, imovel:imoveis!inner(user_id)').eq('imovel.user_id', user.id),
    admin.from('inquilino_tokens').select('*').eq('user_id', user.id),
    admin.from('documentos_imovel').select('*').eq('user_id', user.id),
    admin.from('documentos_aluguel').select('*').eq('user_id', user.id),
    admin.from('documentos_inquilino').select('*').eq('user_id', user.id),
    admin.from('tickets').select('*').eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from('ticket_mensagens' as any) as any)
      .select('*, ticket:tickets!inner(user_id)')
      .eq('ticket.user_id', user.id),
    admin.from('notificacoes').select('*').eq('user_id', user.id),
  ])

  // Profile: remove campos internos sensíveis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileSafe: Record<string, unknown> = { ...(profile as any ?? {}) }
  delete profileSafe.asaas_api_key_enc

  await registrarLog(user.id, 'USER_EXPORTOU_DADOS', 'lgpd', undefined, {})

  return {
    dados: {
      exportadoEm: new Date().toISOString(),
      versao: 1,
      titular: { id: user.id, email: user.email },
      perfil: profileSafe,
      imoveis: imoveis ?? [],
      inquilinos: inquilinos ?? [],
      alugueis: alugueis ?? [],
      tokens_inquilino: tokens ?? [],
      documentos: {
        imovel: docsImovel ?? [],
        aluguel: docsAluguel ?? [],
        inquilino: docsInquilino ?? [],
      },
      suporte: {
        tickets: tickets ?? [],
        mensagens: ticketMensagens ?? [],
      },
      notificacoes: notificacoes ?? [],
    },
  }
}

// ── LGPD: Excluir conta (direito ao esquecimento) ──────────────────────────
// Anonimiza dados pessoais, desativa imóveis/inquilinos, cancela
// assinatura Stripe ativa, revoga tokens, fecha tickets, deleta auth.
// Dados contábeis (aluguéis pagos) permanecem como exige a Receita.

export async function excluirConta(input: { confirmacao_email: string }): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (input.confirmacao_email !== user.email) {
    return { error: 'Confirmação de e-mail não confere.' }
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_subscription_id, stripe_subscription_status, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    return { error: 'Admins não podem se excluir. Contate outro admin.' }
  }

  // 1. Cancela assinatura Stripe se ativa
  if (
    profile?.stripe_subscription_id &&
    profile.stripe_subscription_status &&
    ['active', 'trialing', 'past_due'].includes(profile.stripe_subscription_status)
  ) {
    try {
      const stripe = getStripe()
      await stripe.subscriptions.cancel(profile.stripe_subscription_id)
    } catch (err) {
      console.error('[excluirConta] stripe cancel falhou:', err)
      // não bloqueia
    }
  }

  // 2. Desativa imóveis/inquilinos (não deleta — preserva histórico contábil)
  await admin.from('imoveis').update({ ativo: false }).eq('user_id', user.id)
  await admin.from('inquilinos').update({ ativo: false }).eq('user_id', user.id)

  // 3. Revoga tokens
  await admin.from('inquilino_tokens').update({ ativo: false }).eq('user_id', user.id)

  // 4. Fecha tickets abertos
  await admin
    .from('tickets')
    .update({ status: 'fechado', closed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .neq('status', 'fechado')

  // 5. Anonimiza profile
  const anonId = user.id.slice(0, 8)
  await admin
    .from('profiles')
    .update({
      nome:                `Usuário removido ${anonId}`,
      email:               `removido-${anonId}@anonimo.local`,
      telefone:             null,
      deleted_at:           new Date().toISOString(),
      asaas_api_key_enc:    null,
    })
    .eq('id', user.id)

  // 6. Log de auditoria antes do auth delete (pra ter user_id válido)
  await registrarLog(user.id, 'USER_EXCLUIU_CONTA', 'lgpd', undefined, {})

  // 7. Sign out + deleta auth user
  await supabase.auth.signOut()
  try {
    const authAdmin = createSupabaseAdminAuthClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    await authAdmin.auth.admin.deleteUser(user.id)
  } catch (err) {
    console.error('[excluirConta] auth deleteUser falhou:', err)
  }

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
    // Em api_version 2026-03-25+, o Customer Portal pode ter cancelado via
    // cancel_at (timestamp) em vez de cancel_at_period_end. Limpamos ambos.
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
      cancel_at: null,
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
