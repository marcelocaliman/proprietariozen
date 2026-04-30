import { config } from 'dotenv'
import Stripe from 'stripe'

config({ path: '.env.local' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const sessions = await stripe.checkout.sessions.list({ limit: 5 })
console.log('\n── Últimas 5 Checkout Sessions ──')
for (const s of sessions.data) {
  const ageMin = Math.round((Date.now() / 1000 - s.created) / 60)
  console.log(`\n  ${s.id}`)
  console.log(`    Criada:        há ${ageMin} min`)
  console.log(`    Status:        ${s.status}`)
  console.log(`    Payment:       ${s.payment_status}`)
  console.log(`    Mode:          ${s.mode}`)
  console.log(`    Customer:      ${s.customer}`)
  console.log(`    Email:         ${s.customer_details?.email ?? s.customer_email ?? '—'}`)
  console.log(`    Subscription:  ${s.subscription ?? '—'}`)
  console.log(`    Success URL:   ${s.success_url}`)
  console.log(`    Amount total:  ${s.amount_total ? `R$ ${(s.amount_total / 100).toFixed(2)}` : '—'}`)
}

const subs = await stripe.subscriptions.list({ limit: 3, status: 'all' })
console.log(`\n\n── Últimas 3 Subscriptions ──`)
for (const sub of subs.data) {
  const ageMin = Math.round((Date.now() / 1000 - sub.created) / 60)
  console.log(`\n  ${sub.id}`)
  console.log(`    Criada:    há ${ageMin} min`)
  console.log(`    Status:    ${sub.status}`)
  console.log(`    Customer:  ${sub.customer}`)
  console.log(`    Price ID:  ${sub.items.data[0]?.price.id}`)
  console.log(`    Valor:     R$ ${((sub.items.data[0]?.price.unit_amount ?? 0) / 100).toFixed(2)}/mês`)
}
console.log()
