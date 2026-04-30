// Script diagnóstico — lê STRIPE_SECRET_KEY do .env.local e mostra
// info da conta + webhooks registrados. Idempotente, read-only.
import { config } from 'dotenv'
import Stripe from 'stripe'

config({ path: '.env.local' })

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('STRIPE_SECRET_KEY ausente em .env.local')
  process.exit(1)
}

const mode = key.startsWith('sk_live_') ? 'LIVE' : key.startsWith('sk_test_') ? 'TEST' : 'desconhecido'
console.log(`\nModo: ${mode}\n`)

const stripe = new Stripe(key)

try {
  const acc = await stripe.accounts.retrieve()
  console.log('── Conta Stripe ativa ──')
  console.log(`  ID:        ${acc.id}`)
  console.log(`  Nome:      ${acc.business_profile?.name ?? acc.settings?.dashboard?.display_name ?? '(sem nome)'}`)
  console.log(`  E-mail:    ${acc.email ?? '(sem email)'}`)
  console.log(`  País:      ${acc.country ?? '—'}`)
  console.log(`  Charges:   ${acc.charges_enabled ? 'habilitadas' : 'DESABILITADAS'}`)
  console.log(`  Payouts:   ${acc.payouts_enabled ? 'habilitados'  : 'DESABILITADOS'}`)
} catch (err) {
  console.error('Erro ao buscar conta:', err.message)
}

try {
  const webhooks = await stripe.webhookEndpoints.list({ limit: 20 })
  console.log(`\n── Webhooks registrados (${webhooks.data.length}) ──`)
  if (webhooks.data.length === 0) {
    console.log('  (nenhum webhook registrado nessa conta)')
  } else {
    for (const wh of webhooks.data) {
      console.log(`\n  • ${wh.url}`)
      console.log(`    ID:       ${wh.id}`)
      console.log(`    Status:   ${wh.status}`)
      console.log(`    Eventos:  ${wh.enabled_events.join(', ')}`)
    }
  }
} catch (err) {
  console.error('Erro ao listar webhooks:', err.message)
}

console.log()
