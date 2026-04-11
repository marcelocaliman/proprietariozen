import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  enviarLembreteVencimento,
  enviarAlertaAtraso,
  enviarAlertaReajuste,
} from '@/lib/email'

// POST /api/emails
// Envia um e-mail de alerta avulso (acionado manualmente pelo proprietário).
// Body:
//   { tipo: 'vencimento', aluguelId: string }
//   { tipo: 'atraso',     aluguelId: string }
//   { tipo: 'reajuste',   imovelId:  string }

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { tipo } = body as { tipo: string }

    // Busca o perfil do proprietário logado
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, email, telefone')
      .eq('id', user.id)
      .single()

    if (!profile?.email) {
      return NextResponse.json({ error: 'Perfil do proprietário não encontrado' }, { status: 400 })
    }

    // ── Lembrete de vencimento ────────────────────────────────────────────────
    if (tipo === 'vencimento') {
      const { aluguelId } = body as { aluguelId: string }
      const { data: aluguel } = await supabase
        .from('alugueis')
        .select(`
          id, valor, data_vencimento, mes_referencia,
          imovel:imoveis!inner(apelido, user_id),
          inquilino:inquilinos(nome)
        `)
        .eq('id', aluguelId)
        .eq('imovel.user_id', user.id)
        .single() as { data: {
          id: string; valor: number; data_vencimento: string; mes_referencia: string
          imovel: { apelido: string } | null
          inquilino: { nome: string } | null
        } | null }

      if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })

      await enviarLembreteVencimento({
        para: profile.email,
        nomeProprietario: profile.nome,
        nomeImovel: aluguel.imovel?.apelido ?? 'Imóvel',
        nomeInquilino: aluguel.inquilino?.nome ?? null,
        valor: aluguel.valor,
        dataVencimento: aluguel.data_vencimento,
        mesReferencia: aluguel.mes_referencia,
      })

      return NextResponse.json({ ok: true, tipo, enviado_para: profile.email })
    }

    // ── Alerta de atraso ──────────────────────────────────────────────────────
    if (tipo === 'atraso') {
      const { aluguelId } = body as { aluguelId: string }
      const { data: aluguel } = await supabase
        .from('alugueis')
        .select(`
          id, valor, data_vencimento, mes_referencia,
          imovel:imoveis!inner(apelido, user_id),
          inquilino:inquilinos(nome)
        `)
        .eq('id', aluguelId)
        .eq('imovel.user_id', user.id)
        .single() as { data: {
          id: string; valor: number; data_vencimento: string; mes_referencia: string
          imovel: { apelido: string } | null
          inquilino: { nome: string } | null
        } | null }

      if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })

      const venc = new Date(aluguel.data_vencimento + 'T00:00:00')
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
      const dias = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000))

      await enviarAlertaAtraso({
        para: profile.email,
        nomeProprietario: profile.nome,
        nomeImovel: aluguel.imovel?.apelido ?? 'Imóvel',
        nomeInquilino: aluguel.inquilino?.nome ?? null,
        valor: aluguel.valor,
        dataVencimento: aluguel.data_vencimento,
        diasAtraso: dias,
        mesReferencia: aluguel.mes_referencia,
      })

      return NextResponse.json({ ok: true, tipo, enviado_para: profile.email })
    }

    // ── Alerta de reajuste ────────────────────────────────────────────────────
    if (tipo === 'reajuste') {
      const { imovelId } = body as { imovelId: string }
      const { data: imovel } = await supabase
        .from('imoveis')
        .select('apelido, valor_aluguel, indice_reajuste, percentual_fixo, data_proximo_reajuste')
        .eq('id', imovelId)
        .eq('user_id', user.id)
        .single()

      if (!imovel || !imovel.data_proximo_reajuste) {
        return NextResponse.json({ error: 'Imóvel não encontrado ou sem data de reajuste' }, { status: 404 })
      }

      await enviarAlertaReajuste({
        para: profile.email,
        nomeProprietario: profile.nome,
        nomeImovel: imovel.apelido,
        valorAtual: imovel.valor_aluguel,
        indiceReajuste: imovel.indice_reajuste,
        percentualFixo: imovel.percentual_fixo,
        dataReajuste: imovel.data_proximo_reajuste,
      })

      return NextResponse.json({ ok: true, tipo, enviado_para: profile.email })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/emails]', err)
    return NextResponse.json({ error: 'Erro interno ao enviar e-mail' }, { status: 500 })
  }
}
