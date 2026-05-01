// Sincroniza um único customer com sua subscription mais recente do Stripe.
// Usado quando o webhook falhou e precisamos forçar a sync.
import { config } from 'dotenv'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const customerId = process.argv[2]
if (!customerId) {
  console.error('Uso: node scripts/sync-one-customer.mjs cus_XXX')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 })
const sub = subs.data[0]
if (!sub) {
  console.error('Sem subscriptions para esse customer')
  process.exit(1)
}

const priceId = sub.items.data[0]?.price.id ?? null
const isAtiva = sub.status === 'active' || sub.status === 'trialing'
const planoEfetivo = !isAtiva
  ? 'gratis'
  : process.env.STRIPE_ELITE_PRICE_ID && priceId === process.env.STRIPE_ELITE_PRICE_ID
    ? 'elite'
    : 'pago'

const periodEnd = sub.current_period_end ?? sub.items.data[0]?.current_period_end
const payload = {
  plano: planoEfetivo,
  stripe_subscription_id: sub.id,
  stripe_subscription_status: sub.status,
  stripe_subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  stripe_subscription_cancel_at_period_end:
    sub.cancel_at_period_end === true
    || (sub.cancel_at != null && sub.canceled_at == null),
  stripe_price_id: priceId,
}

console.log('\nVai gravar no profile:', payload, '\n')

const { error } = await supabase
  .from('profiles')
  .update(payload)
  .eq('stripe_customer_id', customerId)

if (error) {
  console.error('Erro:', error.message)
  process.exit(1)
}

console.log('✅ Profile sincronizado.')
