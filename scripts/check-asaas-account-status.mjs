// Consulta status real da SUA conta marcelo no Asaas
// pra ver o que significa o PENDING que está na DB.
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function decryptKey(enc) {
  const [ivHex, tagHex, ctHex] = enc.split(':')
  const key = Buffer.from(process.env.ASAAS_ENCRYPTION_KEY, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
}

const { data: profile } = await supabase
  .from('profiles')
  .select('email, asaas_account_id, asaas_api_key_enc, asaas_account_status')
  .eq('email', 'marcelo.salgado.caliman@gmail.com')
  .maybeSingle()

console.log(`Profile: ${profile.email}`)
console.log(`asaas_account_id: ${profile.asaas_account_id}`)
console.log(`asaas_account_status (DB): ${profile.asaas_account_status}\n`)

const decryptedKey = decryptKey(profile.asaas_api_key_enc)
const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://api.asaas.com/v3'

// 1. Consulta status atual no Asaas
const statusRes = await fetch(`${baseUrl}/myAccount/status`, {
  headers: { access_token: decryptedKey },
})
const statusJson = await statusRes.json()
console.log('── Status atual no Asaas ──')
console.log(JSON.stringify(statusJson, null, 2))

// 2. Dados completos da conta
const meRes = await fetch(`${baseUrl}/myAccount`, {
  headers: { access_token: decryptedKey },
})
const meJson = await meRes.json()
console.log('\n── Detalhes da conta ──')
console.log(`  Nome:         ${meJson.name ?? '—'}`)
console.log(`  E-mail:       ${meJson.email ?? '—'}`)
console.log(`  CPF/CNPJ:     ${meJson.cpfCnpj ?? '—'}`)
console.log(`  Telefone:     ${meJson.mobilePhone ?? meJson.phone ?? '—'}`)
console.log(`  Endereço:     ${meJson.address ?? '—'} ${meJson.addressNumber ?? ''}`)
console.log(`  CEP:          ${meJson.postalCode ?? '—'}`)
console.log(`  Cidade/UF:    ${meJson.city ?? '—'} / ${meJson.state ?? '—'}`)
