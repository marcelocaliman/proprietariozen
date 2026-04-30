// Verifica os campos de sync Stripe de um profile.
// Uso: node scripts/check-profile-sync.mjs <email>
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const email = process.argv[2]
if (!email) {
  console.error('Uso: node scripts/check-profile-sync.mjs <email>')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const { data, error } = await supabase
  .from('profiles')
  .select('id, email, plano, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_subscription_current_period_end, stripe_price_id, atualizado_em')
  .eq('email', email)
  .single()

if (error) {
  console.error('Erro:', error.message)
  process.exit(1)
}

console.log(`\n── Profile ${email} ──`)
console.log(`  ID:                                       ${data.id}`)
console.log(`  Plano:                                    ${data.plano}`)
console.log(`  stripe_customer_id:                       ${data.stripe_customer_id ?? '—'}`)
console.log(`  stripe_subscription_id:                   ${data.stripe_subscription_id ?? '—'}`)
console.log(`  stripe_subscription_status:               ${data.stripe_subscription_status ?? '—'}`)
console.log(`  stripe_subscription_current_period_end:   ${data.stripe_subscription_current_period_end ?? '—'}`)
console.log(`  stripe_price_id:                          ${data.stripe_price_id ?? '—'}`)
console.log(`  atualizado_em:                            ${data.atualizado_em}`)
console.log()
