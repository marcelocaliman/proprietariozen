import 'server-only'
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPlanoPago } from '@/lib/stripe'

const CIPHER = 'aes-256-gcm'

function encryptionKey(): Buffer {
  const hex = process.env.ASAAS_ENCRYPTION_KEY ?? ''
  if (hex.length !== 64) throw new Error('ASAAS_ENCRYPTION_KEY deve ter 64 caracteres hex.')
  return Buffer.from(hex, 'hex')
}

function decryptApiKey(enc: string): string {
  const parts = enc.split(':')
  if (parts.length !== 3) throw new Error('Formato de apiKey inválido.')
  const [ivHex, tagHex, ctHex] = parts
  const key = encryptionKey()
  const decipher = crypto.createDecipheriv(CIPHER, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
}

export type CriarCobrancaOk = {
  ok: true
  chargeId: string
  pixQrcode: string | null
  pixCopiaECola: string | null
  boletoUrl: string | null
}

export type CriarCobrancaErro = {
  ok: false
  error: string
  /** Código que descreve a categoria do erro — útil para health check e UI */
  code:
    | 'aluguel_nao_encontrado'
    | 'ja_pago'
    | 'ja_tem_cobranca'
    | 'nao_e_automatico'
    | 'plano_insuficiente'
    | 'asaas_nao_vinculado'
    | 'inquilino_sem_cpf'
    | 'asaas_falha_comunicacao'
    | 'asaas_erro_api'
    | 'persist_falhou'
    | 'erro_interno'
}

export type CriarCobrancaResultado = CriarCobrancaOk | CriarCobrancaErro

/**
 * Cria cobrança Asaas para um aluguel, sem depender de sessão de usuário.
 * Pode ser chamada por API routes (com user.id verificado) ou por cron jobs (com admin).
 *
 * Idempotente: se o aluguel já tem asaas_charge_id, retorna ok sem recriar.
 *
 * Side effects:
 *   - Cria/reusa Asaas customer no inquilino
 *   - Salva customer_id no inquilino
 *   - Cria Asaas payment
 *   - Salva charge_id, PIX e boleto no aluguel
 */
export async function criarCobrancaAsaasInterno(
  admin: SupabaseClient,
  params: { aluguelId: string; userId: string },
): Promise<CriarCobrancaResultado> {
  const { aluguelId, userId } = params

  // 1. Carrega aluguel + imóvel + inquilino
  const { data: aluguel } = await admin
    .from('alugueis')
    .select(`
      id, valor, data_vencimento, mes_referencia, status,
      asaas_charge_id, asaas_pix_qrcode, asaas_pix_copiaecola, asaas_boleto_url,
      imovel:imoveis!inner(id, apelido, billing_mode, user_id),
      inquilino:inquilinos(id, nome, cpf, email, telefone, asaas_customer_id)
    `)
    .eq('id', aluguelId)
    .single()

  if (!aluguel) return { ok: false, error: 'Aluguel não encontrado', code: 'aluguel_nao_encontrado' }

  const imovel = Array.isArray(aluguel.imovel) ? aluguel.imovel[0] : aluguel.imovel
  const inquilino = Array.isArray(aluguel.inquilino) ? aluguel.inquilino[0] : aluguel.inquilino

  if ((imovel as { user_id?: string } | null)?.user_id !== userId) {
    return { ok: false, error: 'Aluguel não encontrado', code: 'aluguel_nao_encontrado' }
  }

  if (aluguel.status === 'pago') {
    return { ok: false, error: 'Aluguel já está pago', code: 'ja_pago' }
  }

  // Idempotência: já tem cobrança
  if (aluguel.asaas_charge_id) {
    return {
      ok: true,
      chargeId: aluguel.asaas_charge_id as string,
      pixQrcode: (aluguel.asaas_pix_qrcode as string | null) ?? null,
      pixCopiaECola: (aluguel.asaas_pix_copiaecola as string | null) ?? null,
      boletoUrl: (aluguel.asaas_boleto_url as string | null) ?? null,
    }
  }

  if ((imovel as { billing_mode?: string } | null)?.billing_mode !== 'AUTOMATIC') {
    return { ok: false, error: 'Imóvel não configurado para cobrança automática', code: 'nao_e_automatico' }
  }

  // 2. Carrega perfil do proprietário (plano + chave Asaas)
  const { data: profile } = await admin
    .from('profiles')
    .select('asaas_api_key_enc, plano, role')
    .eq('id', userId)
    .single()

  const isPaid = profile?.role === 'admin' || isPlanoPago((profile?.plano as 'gratis' | 'pago' | 'elite') ?? 'gratis')
  if (!isPaid) {
    return { ok: false, error: 'Cobrança automática disponível apenas no plano Pro.', code: 'plano_insuficiente' }
  }

  if (!profile?.asaas_api_key_enc) {
    return { ok: false, error: 'Conta Asaas não vinculada. Configure em Configurações.', code: 'asaas_nao_vinculado' }
  }

  // 3. Decripta credencial
  const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'
  let apiKey: string
  try {
    apiKey = decryptApiKey(profile.asaas_api_key_enc as string)
  } catch {
    return { ok: false, error: 'Erro ao acessar credenciais Asaas', code: 'erro_interno' }
  }

  const headers = {
    'access_token': apiKey,
    'Content-Type': 'application/json',
    'User-Agent': 'ProprietarioZen/1.0',
  }

  // 4. Garante customer Asaas no inquilino
  const inq = inquilino as {
    id: string; nome: string; cpf: string | null
    email: string | null; telefone: string | null; asaas_customer_id: string | null
  } | null

  let customerId = inq?.asaas_customer_id ?? null

  if (!customerId) {
    if (!inq?.cpf) {
      return {
        ok: false,
        error: 'Inquilino sem CPF — cadastre o CPF para gerar cobrança Asaas',
        code: 'inquilino_sem_cpf',
      }
    }

    try {
      const searchRes = await fetch(
        `${baseUrl}/customers?cpfCnpj=${encodeURIComponent(inq.cpf)}`,
        { headers, cache: 'no-store' },
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json() as { data?: { id: string }[] }
        customerId = searchData.data?.[0]?.id ?? null
      }
    } catch (err) {
      console.error('[Asaas/lib] Falha ao buscar cliente:', err)
      return { ok: false, error: 'Falha de comunicação com o Asaas ao buscar cliente.', code: 'asaas_falha_comunicacao' }
    }

    if (!customerId) {
      let createRes: Response
      try {
        createRes = await fetch(`${baseUrl}/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: inq.nome,
            cpfCnpj: inq.cpf,
            email: inq.email ?? undefined,
            mobilePhone: inq.telefone ?? undefined,
          }),
        })
      } catch (err) {
        console.error('[Asaas/lib] Falha ao criar cliente:', err)
        return { ok: false, error: 'Falha de comunicação com o Asaas ao criar cliente.', code: 'asaas_falha_comunicacao' }
      }
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({})) as { errors?: { description: string }[] }
        return {
          ok: false,
          error: err.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas',
          code: 'asaas_erro_api',
        }
      }
      const newCustomer = await createRes.json() as { id: string }
      customerId = newCustomer.id
    }

    if (customerId && inq?.id) {
      await admin.from('inquilinos').update({ asaas_customer_id: customerId }).eq('id', inq.id)
    }
  }

  // 5. Calcula vencimento (não pode ser passado)
  const hoje = new Date().toISOString().split('T')[0]
  const dueDate = (aluguel.data_vencimento as string) >= hoje
    ? aluguel.data_vencimento as string
    : hoje

  // 6. Descrição
  const [anoRef, mesRef] = (aluguel.mes_referencia as string).split('-')
  const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
    .format(new Date(parseInt(anoRef), parseInt(mesRef) - 1, 1))
  const mesLabel = mesNome.charAt(0).toUpperCase() + mesNome.slice(1)
  const description = `Aluguel — ${(imovel as { apelido?: string } | null)?.apelido ?? 'Imóvel'} — ${mesLabel}/${anoRef}`

  // 7. Cria cobrança
  let chargeRes: Response
  try {
    chargeRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: aluguel.valor,
        dueDate,
        description,
      }),
    })
  } catch (err) {
    console.error('[Asaas/lib] Falha ao criar cobrança:', err)
    return { ok: false, error: 'Falha de comunicação com o Asaas. Verifique a URL da API.', code: 'asaas_falha_comunicacao' }
  }

  if (!chargeRes.ok) {
    const err = await chargeRes.json().catch(() => ({})) as { errors?: { description: string }[] }
    return {
      ok: false,
      error: err.errors?.[0]?.description ?? 'Erro ao criar cobrança no Asaas',
      code: 'asaas_erro_api',
    }
  }

  const charge = await chargeRes.json() as { id: string; bankSlipUrl?: string | null }

  // 8. Busca QR Code PIX (best-effort)
  let pixQrcode: string | null = null
  let pixCopiaECola: string | null = null

  try {
    const pixRes = await fetch(`${baseUrl}/payments/${charge.id}/pixQrCode`, {
      headers,
      cache: 'no-store',
    })
    if (pixRes.ok) {
      const pixData = await pixRes.json() as { encodedImage?: string; payload?: string }
      pixQrcode = pixData.encodedImage ?? null
      pixCopiaECola = pixData.payload ?? null
    }
  } catch (err) {
    console.error('[Asaas/lib] Falha ao buscar PIX QR Code:', err)
  }

  // 9. Persiste no aluguel
  const { error: dbErr } = await admin
    .from('alugueis')
    .update({
      asaas_charge_id: charge.id,
      asaas_pix_qrcode: pixQrcode,
      asaas_pix_copiaecola: pixCopiaECola,
      asaas_boleto_url: charge.bankSlipUrl ?? null,
    })
    .eq('id', aluguelId)

  if (dbErr) {
    console.error('[Asaas/lib] CRÍTICO: cobrança criada mas falhou ao salvar:', {
      chargeId: charge.id, aluguelId, error: dbErr.message,
    })
    return {
      ok: false,
      error: `Cobrança criada (${charge.id}) mas falhou ao salvar no banco. Suporte necessário.`,
      code: 'persist_falhou',
    }
  }

  return {
    ok: true,
    chargeId: charge.id,
    pixQrcode,
    pixCopiaECola,
    boletoUrl: charge.bankSlipUrl ?? null,
  }
}
