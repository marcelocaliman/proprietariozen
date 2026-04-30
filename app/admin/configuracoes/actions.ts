'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { setSystemSetting, type SystemSettingKey, type SystemSettings } from '@/lib/system-settings'
import { registrarLog } from '@/lib/log'
import { EMAIL_SLUGS, clearEmailOverridesCache, type EmailSlug } from '@/lib/email-overrides'
import { getStripe } from '@/lib/stripe'

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const ok = await isAdmin(user.id)
  if (!ok) return { error: 'Acesso negado' }
  return { userId: user.id }
}

export async function atualizarSetting<K extends SystemSettingKey>(
  key: K,
  value: SystemSettings[K],
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createAdminClient()
  const result = await setSystemSetting(admin, key, value, auth.userId)
  if (result.error) return result

  await registrarLog(auth.userId, 'ADMIN_SETTING_UPDATED', 'system_settings', key, {
    key,
    value,
  })

  revalidatePath('/admin/configuracoes')
  revalidatePath('/dashboard')
  revalidatePath('/')
  return {}
}

export async function executarCronAlertas(): Promise<{ error?: string; result?: unknown }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const secret = process.env.CRON_SECRET
  if (!secret) return { error: 'CRON_SECRET não configurado' }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://proprietariozen.com.br'}/api/cron/alertas`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Erro ao executar' }

    await registrarLog(auth.userId, 'ADMIN_CRON_TRIGGERED', 'cron', 'alertas', { result: data })
    revalidatePath('/admin/configuracoes')
    return { result: data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha na requisição' }
  }
}

export async function salvarEmailOverride(
  slug: string,
  payload: { enabled: boolean; subject_override: string | null; html_override: string | null },
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (!EMAIL_SLUGS.includes(slug as EmailSlug)) {
    return { error: 'Slug de template inválido' }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('email_template_overrides') as any).upsert({
    slug,
    enabled: payload.enabled,
    subject_override: payload.subject_override,
    html_override: payload.html_override,
    updated_at: new Date().toISOString(),
    updated_by: auth.userId,
  })

  if (error) return { error: error.message }

  clearEmailOverridesCache()
  await registrarLog(auth.userId, 'ADMIN_EMAIL_TEMPLATE_UPDATED', 'email_template', slug, payload)
  revalidatePath('/admin/configuracoes')
  return {}
}

// Backfill: percorre todos os profiles com stripe_customer_id e
// sincroniza status/period_end/price_id da subscription mais recente via API.
// Idempotente — pode ser rodado quantas vezes quiser.
export async function backfillStripeSubscriptions(): Promise<{
  error?: string
  total?: number
  atualizados?: number
  semSub?: number
  erros?: number
}> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createAdminClient()
  const stripe = getStripe()

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id, stripe_customer_id, plano_override_motivo')
    .not('stripe_customer_id', 'is', null)

  if (profErr) return { error: profErr.message }

  let atualizados = 0
  let semSub = 0
  let erros = 0

  for (const p of profiles ?? []) {
    if (!p.stripe_customer_id) continue
    try {
      const subs = await stripe.subscriptions.list({
        customer: p.stripe_customer_id,
        status: 'all',
        limit: 1,
      })
      const sub = subs.data[0]
      if (!sub) {
        // Nunca teve subscription — limpa eventuais campos stale
        await admin.from('profiles').update({
          stripe_subscription_id: null,
          stripe_subscription_status: null,
          stripe_subscription_current_period_end: null,
          stripe_subscription_cancel_at_period_end: false,
          stripe_price_id: null,
        }).eq('id', p.id)
        semSub++
        continue
      }

      const priceId = sub.items.data[0]?.price.id ?? null
      const isAtiva = sub.status === 'active' || sub.status === 'trialing'
      const planoEfetivo = !isAtiva
        ? 'gratis'
        : process.env.STRIPE_ELITE_PRICE_ID && priceId === process.env.STRIPE_ELITE_PRICE_ID
          ? 'elite'
          : 'pago'

      // Em api_version 2026-03-25+, current_period_end foi movido pra items.data[].
      const periodEndUnix =
        (sub as unknown as { current_period_end?: number }).current_period_end
        ?? (sub.items.data[0] as unknown as { current_period_end?: number })?.current_period_end
      const updatePayload = {
        stripe_subscription_id: sub.id,
        stripe_subscription_status: sub.status,
        stripe_subscription_current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
        stripe_subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
        stripe_price_id: priceId,
        // Só sobrescreve plano se não tem override manual
        ...(p.plano_override_motivo ? {} : { plano: planoEfetivo as 'gratis' | 'pago' | 'elite' }),
      }

      await admin.from('profiles').update(updatePayload).eq('id', p.id)
      atualizados++
    } catch (err) {
      console.error('[backfill] erro em profile', p.id, err)
      erros++
    }
  }

  await registrarLog(auth.userId, 'ADMIN_STRIPE_BACKFILL', 'subscriptions', undefined, {
    total: profiles?.length ?? 0, atualizados, semSub, erros,
  })

  revalidatePath('/admin/configuracoes')
  return { total: profiles?.length ?? 0, atualizados, semSub, erros }
}

export async function executarCronGerarAlugueis(): Promise<{ error?: string; result?: unknown }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const secret = process.env.CRON_SECRET
  if (!secret) return { error: 'CRON_SECRET não configurado' }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://proprietariozen.com.br'}/api/cron/gerar-alugueis`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Erro ao executar' }

    await registrarLog(auth.userId, 'ADMIN_CRON_TRIGGERED', 'cron', 'gerar-alugueis', { result: data })
    revalidatePath('/admin/configuracoes')
    return { result: data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha na requisição' }
  }
}
