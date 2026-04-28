import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { enviarCobrancaParaInquilino } from '@/lib/email'
import { criarCobrancaAsaasInterno } from '@/lib/asaas/charge'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = createAdminClient()

    // Carrega aluguel inicial — usado para checks de propriedade e modo
    const { data: aluguelBase, error: aluguelErr } = await admin
      .from('alugueis')
      .select(`
        id, valor, data_vencimento, mes_referencia,
        asaas_charge_id, asaas_pix_copiaecola, asaas_boleto_url,
        imovel:imoveis!inner(apelido, user_id, billing_mode),
        inquilino:inquilinos(nome, email)
      `)
      .eq('id', params.id)
      .single()

    if (aluguelErr || !aluguelBase) {
      return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })
    }

    const imovel = aluguelBase.imovel as { apelido: string; user_id: string; billing_mode: string | null } | null
    if (imovel?.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const inquilino = aluguelBase.inquilino as { nome: string; email: string | null } | null
    if (!inquilino?.email) {
      return NextResponse.json({ error: 'Inquilino sem e-mail cadastrado' }, { status: 400 })
    }

    const isAutomatic = imovel?.billing_mode === 'AUTOMATIC'

    // Se for AUTOMATIC e ainda não há cobrança Asaas, gera agora.
    // Mantém o fluxo "envio por email" sempre funcional sem o gestor ter que clicar em 2 lugares.
    let pixCopiaECola = aluguelBase.asaas_pix_copiaecola as string | null ?? null
    let boletoUrl = aluguelBase.asaas_boleto_url as string | null ?? null

    if (isAutomatic && !aluguelBase.asaas_charge_id) {
      const charge = await criarCobrancaAsaasInterno(admin, {
        aluguelId: params.id,
        userId: user.id,
      })
      if (!charge.ok) {
        return NextResponse.json({ error: charge.error, code: charge.code }, { status: 400 })
      }
      pixCopiaECola = charge.pixCopiaECola
      boletoUrl = charge.boletoUrl
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single()

    const pixKey = (user.user_metadata?.pix_key as string | null) ?? null
    const pixKeyTipo = (user.user_metadata?.pix_key_tipo as string | null) ?? null

    await enviarCobrancaParaInquilino({
      para: inquilino.email,
      nomeInquilino: inquilino.nome,
      nomeProprietario: profile?.nome ?? 'Proprietário',
      nomeImovel: imovel?.apelido ?? '',
      valor: aluguelBase.valor,
      mesReferencia: aluguelBase.mes_referencia,
      dataVencimento: aluguelBase.data_vencimento,
      pixKey:            isAutomatic ? null : pixKey,
      pixKeyTipo:        isAutomatic ? null : pixKeyTipo,
      asaasPixCopiaECola: isAutomatic ? pixCopiaECola : null,
      assasBoletoUrl:     isAutomatic ? boletoUrl : null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[enviar-cobranca] Erro:', msg)
    return NextResponse.json({ error: 'Erro ao enviar e-mail', detail: msg }, { status: 500 })
  }
}
