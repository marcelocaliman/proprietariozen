// Health check Asaas: conta root, subcontas, webhook, cobranças recentes.
// Read-only — não cria, não modifica nada.
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const ROOT_KEY = process.env.ASAAS_API_KEY_ROOT
const BASE_URL = process.env.ASAAS_BASE_URL ?? 'https://api.asaas.com/v3'

if (!ROOT_KEY) {
  console.error('❌ ASAAS_API_KEY_ROOT ausente em .env.local')
  process.exit(1)
}

const mode = ROOT_KEY.startsWith('$aact_prod_') ? 'PRODUÇÃO'
  : ROOT_KEY.startsWith('$aact_hmlg_') ? 'HOMOLOGAÇÃO'
  : ROOT_KEY.startsWith('$aact_') ? 'SANDBOX/DEV'
  : 'desconhecido'

console.log(`\nModo: ${mode}`)
console.log(`Base URL: ${BASE_URL}\n`)

async function asaas(path, opts = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: { access_token: ROOT_KEY, 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { status: res.status, ok: res.ok, json }
}

// ── 1. Conta root (proprietariozen) ──
console.log('── 1. Conta root da plataforma ──')
const me = await asaas('/myAccount')
if (!me.ok) {
  console.log(`  ❌ Falha ${me.status}:`, me.json)
} else {
  console.log(`  ✅ ${me.json.name ?? '(sem nome)'}`)
  console.log(`     E-mail:   ${me.json.email ?? '—'}`)
  console.log(`     CPF/CNPJ: ${me.json.cpfCnpj ?? '—'}`)
  console.log(`     ID:       ${me.json.id ?? '—'}`)
}

// ── 2. Subcontas (proprietários da plataforma) ──
console.log('\n── 2. Subcontas registradas no Asaas (marketplace) ──')
const accounts = await asaas('/accounts?limit=20')
if (!accounts.ok) {
  console.log(`  ❌ Falha ${accounts.status}:`, accounts.json)
} else {
  const total = accounts.json.totalCount ?? 0
  console.log(`  Total: ${total}`)
  for (const a of (accounts.json.data ?? []).slice(0, 10)) {
    console.log(`     • ${a.name ?? '—'} · ${a.email ?? '—'} · status: ${a.status ?? '—'}`)
  }
}

// ── 3. Webhook configurado ──
console.log('\n── 3. Webhooks registrados ──')
const webhooks = await asaas('/webhooks')
if (!webhooks.ok) {
  console.log(`  ❌ Falha ${webhooks.status}:`, webhooks.json)
} else {
  const list = webhooks.json.data ?? []
  if (list.length === 0) {
    console.log('  ⚠️  Nenhum webhook registrado nessa conta')
  } else {
    for (const w of list) {
      console.log(`     • URL: ${w.url}`)
      console.log(`       Status: ${w.enabled === false ? 'DESABILITADO' : 'ativo'}`)
      console.log(`       Eventos: ${(w.events ?? []).join(', ')}`)
      console.log(`       Email p/ erros: ${w.email ?? '—'}`)
    }
  }
}

// ── 4. Cobranças recentes na conta root ──
console.log('\n── 4. Cobranças recentes (conta root) ──')
const charges = await asaas('/payments?limit=10&order=desc')
if (!charges.ok) {
  console.log(`  ❌ Falha ${charges.status}:`, charges.json)
} else {
  const list = charges.json.data ?? []
  console.log(`  Total exibido: ${list.length} (de ${charges.json.totalCount ?? '?'})`)
  for (const c of list.slice(0, 5)) {
    console.log(`     • ${c.id} · R$ ${c.value} · ${c.status} · venc: ${c.dueDate} · ${c.billingType}`)
  }
}

// ── 5. Profiles na DB com integração Asaas ──
console.log('\n── 5. Profiles na DB com integração Asaas ──')
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data } = await supabase
    .from('profiles')
    .select('id, email, asaas_account_id, asaas_account_status, asaas_api_key_enc')
    .not('asaas_account_id', 'is', null)
  console.log(`  ${(data ?? []).length} profile(s) com asaas_account_id`)
  for (const p of data ?? []) {
    const temKey = p.asaas_api_key_enc ? '✓' : '✗'
    console.log(`     • ${p.email} · status: ${p.asaas_account_status ?? '—'} · key: ${temKey}`)
  }

  // Aluguéis com cobrança Asaas
  const { count: alugueisAsaas } = await supabase
    .from('alugueis')
    .select('id', { count: 'exact', head: true })
    .not('asaas_charge_id', 'is', null)
  console.log(`\n  Aluguéis com asaas_charge_id: ${alugueisAsaas ?? 0}`)

  const { count: pagosAsaas } = await supabase
    .from('alugueis')
    .select('id', { count: 'exact', head: true })
    .not('asaas_charge_id', 'is', null)
    .eq('status', 'pago')
  console.log(`  Aluguéis pagos via Asaas: ${pagosAsaas ?? 0}`)
}

// ── 6. Webhook esperado vs configurado ──
console.log('\n── 6. URL esperada do webhook ──')
const expectedUrl = 'https://proprietariozen.com.br/api/asaas/webhook'
console.log(`  Esperado: ${expectedUrl}`)

console.log('\n✅ Health check completo.\n')
