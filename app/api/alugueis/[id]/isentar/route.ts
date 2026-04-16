import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import crypto from 'crypto'

const CIPHER = 'aes-256-gcm'

function encryptionKey(): Buffer {
  const hex = process.env.ASAAS_ENCRYPTION_KEY ?? ''
  if (hex.length !== 64) throw new Error('ASAAS_ENCRYPTION_KEY inválida.')
  return Buffer.from(hex, 'hex')
}

function decryptApiKey(enc: string): string {
  const [ivHex, tagHex, ctHex] = enc.split(':')
  const key = encryptionKey()
  const decipher = crypto.createDecipheriv(CIPHER, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json() as { motivo?: string }
    const { motivo } = body

    if (!motivo?.trim()) {
      return NextResponse.json({ error: 'Justificativa obrigatória' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: aluguel } = await admin
      .from('alugueis')
      .select('id, asaas_charge_id, imovel:imoveis!inner(user_id)')
      .eq('id', params.id)
      .single()

    if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })

    const imovel = aluguel.imovel as { user_id: string } | null
    if (imovel?.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Tenta cancelar no Asaas se houver cobrança vinculada (falha silenciosa)
    let asaasAviso: string | null = null
    if (aluguel.asaas_charge_id) {
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('asaas_api_key_enc')
          .eq('id', user.id)
          .single()

        if (profile?.asaas_api_key_enc) {
          const apiKey = decryptApiKey(profile.asaas_api_key_enc)
          const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'
          const res = await fetch(`${baseUrl}/payments/${aluguel.asaas_charge_id}`, {
            method: 'DELETE',
            headers: { access_token: apiKey, 'User-Agent': 'ProprietarioZen/1.0' },
          })
          if (!res.ok && res.status !== 404) {
            asaasAviso = 'Isenção registrada. Verifique manualmente a cobrança no Asaas.'
          }
        }
      } catch {
        asaasAviso = 'Isenção registrada. Verifique manualmente a cobrança no Asaas.'
      }
    }

    const { error: dbErr } = await admin
      .from('alugueis')
      .update({
        isento: true,
        status: 'pago',
        valor_pago: 0,
        motivo_isencao: motivo.trim(),
        data_pagamento: new Date().toISOString().split('T')[0],
        asaas_charge_id: null,
        asaas_pix_qrcode: null,
        asaas_pix_copiaecola: null,
        asaas_boleto_url: null,
      })
      .eq('id', params.id)

    if (dbErr) return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })

    return NextResponse.json({ ok: true, aviso: asaasAviso })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 })
  }
}
