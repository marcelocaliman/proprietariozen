import { config } from 'dotenv'
import Stripe from 'stripe'
config({ path: '.env.local' })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const subId = process.argv[2]
if (!subId) { console.error('Uso: node scripts/check-sub-stripe.mjs sub_XXX'); process.exit(1) }
const sub = await stripe.subscriptions.retrieve(subId)
console.log('\nStatus:', sub.status)
console.log('cancel_at_period_end:', sub.cancel_at_period_end)
console.log('cancel_at:', sub.cancel_at)
console.log('canceled_at:', sub.canceled_at)
console.log('current_period_end (top):', sub.current_period_end)
console.log('current_period_end (item):', sub.items.data[0]?.current_period_end)
console.log()
