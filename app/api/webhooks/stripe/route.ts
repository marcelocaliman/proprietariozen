import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'
import type Stripe from 'stripe'
import type { PlanoTipo } from '@/lib/stripe'

// Desabilita o body parsing automático do Next.js para verificar a assinatura do Stripe
export const dynamic = 'force-dynamic'

/** Determina o plano com base no price ID da assinatura */
function planoParaPriceId(priceId: string): 'pago' | 'elite' {
  if (process.env.STRIPE_ELITE_PRICE_ID && priceId === process.env.STRIPE_ELITE_PRICE_ID) {
    return 'elite'
  }
  return 'pago'
}

// Atualiza plano + dados de subscription no profile.
// Importante: respeita override manual (plano_override_motivo), nunca
// sobrescreve plano de usuário com cortesia ativa.
async function sincronizarSubscription(
  customerId: string,
  patch: {
    plano: PlanoTipo
    stripe_subscription_id: string | null
    stripe_subscription_status: string | null
    stripe_subscription_current_period_end: string | null
    stripe_subscription_cancel_at_period_end: boolean
    stripe_price_id: string | null
  },
) {
  const admin = createAdminClient()

  // Busca o profile primeiro pra checar override
  const { data: profile } = await admin
    .from('profiles')
    .select('id, plano_override_motivo')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.warn('[webhook] customer sem profile correspondente:', customerId)
    return null
  }

  // Se tem override manual, mantém o plano atual (cortesia) e só atualiza
  // os metadados de subscription
  const updatePayload = {
    stripe_subscription_id: patch.stripe_subscription_id,
    stripe_subscription_status: patch.stripe_subscription_status,
    stripe_subscription_current_period_end: patch.stripe_subscription_current_period_end,
    stripe_subscription_cancel_at_period_end: patch.stripe_subscription_cancel_at_period_end,
    stripe_price_id: patch.stripe_price_id,
    ...(profile.plano_override_motivo ? {} : { plano: patch.plano }),
  }

  const { error } = await admin
    .from('profiles')
    .update(updatePayload)
    .eq('id', profile.id)

  if (error) console.error('[webhook] Erro ao sincronizar subscription:', error.message)
  return profile.id
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('[webhook] Assinatura inválida:', err)
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  const customerId =
    typeof (event.data.object as { customer?: string }).customer === 'string'
      ? (event.data.object as { customer: string }).customer
      : null

  if (!customerId) {
    return NextResponse.json({ received: true })
  }

  switch (event.type) {
    // Assinatura criada ou atualizada → sincroniza tudo
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id ?? ''
      // Plano efetivo: 'gratis' se assinatura não estiver ativa/trialing
      const planoEfetivo = (sub.status === 'active' || sub.status === 'trialing')
        ? planoParaPriceId(priceId)
        : 'gratis'
      // Em api_version 2026-03-25+, current_period_end foi movido pra items.data[].
      const periodEndUnix =
        (sub as unknown as { current_period_end?: number }).current_period_end
        ?? (sub.items.data[0] as unknown as { current_period_end?: number })?.current_period_end
      const uid = await sincronizarSubscription(customerId, {
        plano: planoEfetivo,
        stripe_subscription_id: sub.id,
        stripe_subscription_status: sub.status,
        stripe_subscription_current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
        stripe_subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
        stripe_price_id: priceId || null,
      })
      const logAction =
        sub.status === 'canceled' || sub.status === 'unpaid' ? 'CANCELAMENTO'
        : planoEfetivo === 'elite' ? 'UPGRADE_ELITE'
        : 'UPGRADE_PRO'
      if (uid) await registrarLog(uid, logAction, 'subscription', sub.id)
      break
    }

    // Assinatura deletada → marca canceled e volta para gratis
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      // Em api_version 2026-03-25+, current_period_end foi movido pra items.data[].
      const periodEndUnix =
        (sub as unknown as { current_period_end?: number }).current_period_end
        ?? (sub.items.data[0] as unknown as { current_period_end?: number })?.current_period_end
      const uid = await sincronizarSubscription(customerId, {
        plano: 'gratis',
        stripe_subscription_id: sub.id,
        stripe_subscription_status: 'canceled',
        stripe_subscription_current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
        stripe_subscription_cancel_at_period_end: false,
        stripe_price_id: sub.items.data[0]?.price.id ?? null,
      })
      if (uid) await registrarLog(uid, 'CANCELAMENTO', 'subscription', sub.id)
      break
    }

    // Checkout concluído — só loga, sub.created/updated cuida do resto
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.payment_status === 'paid') {
        const admin = createAdminClient()
        const { data: profile } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()
        if (profile) await registrarLog(profile.id, 'UPGRADE_PRO', 'checkout', session.id)
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
