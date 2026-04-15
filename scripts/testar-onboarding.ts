/**
 * Testa a criação de subconta no Asaas — equivale ao que /api/asaas/onboarding faz internamente.
 * Usa CPF fictício: o Asaas rejeita CPFs inválidos sem criar nada, então é seguro testar.
 *
 * Uso: npm run testar-onboarding
 */
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

const apiKey  = process.env.ASAAS_API_KEY_ROOT ?? process.env.ASAAS_API_KEY
const baseUrl = (process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3').replace(/\/$/, '')

type AsaasError = { errors?: { description: string; code?: string }[] }

async function main() {
  if (!apiKey) {
    console.error('❌  ASAAS_API_KEY_ROOT não encontrada no .env.local')
    process.exit(1)
  }

  const payload = {
    name:          'Teste ProprietárioZen',
    email:         'teste-proprietariozem@mailinator.com',
    cpfCnpj:       '00000000000',          // CPF fictício — Asaas retornará erro de validação
    mobilePhone:   '11900000000',
    address:       'Rua de Teste',
    addressNumber: '100',
    province:      'Bairro Teste',
    postalCode:    '01310100',
    birthDate:     '1990-01-01',
  }

  console.log(`\n🧪  Testando criação de subconta Asaas`)
  console.log(`    URL    : ${baseUrl}/accounts`)
  console.log(`    Chave  : ${apiKey.slice(0, 12)}${'*'.repeat(8)}`)
  console.log(`    Payload: ${JSON.stringify(payload, null, 2)}\n`)

  let res: Response
  try {
    res = await fetch(`${baseUrl}/accounts`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'ProprietarioZen/script',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('❌  Falha de rede:')
    console.error(`    ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  const body = await res.json() as Record<string, unknown> & AsaasError

  console.log(`📡  HTTP Status : ${res.status} ${res.statusText}`)
  console.log(`📄  Resposta    :`)
  console.log(JSON.stringify(body, null, 2))

  if (res.ok) {
    console.log('\n✅  Subconta criada com sucesso!')
    console.log(`    ID Asaas : ${body.id}`)
    console.log(`    walletId : ${body.walletId ?? '—'}`)
    console.log(`    apiKey   : ${String(body.apiKey ?? '').slice(0, 12)}...`)
  } else {
    const erros = body.errors?.map(e => `  → [${e.code ?? '?'}] ${e.description}`).join('\n') ?? ''
    console.log(`\n⚠️   Asaas rejeitou a requisição (esperado com CPF fictício):`)
    if (erros) console.log(erros)
  }
  console.log()
}

main()
