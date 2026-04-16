import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { enviarReciboInquilino } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = createAdminClient()

    const { data: aluguel } = await admin
      .from('alugueis')
      .select(`
        id, valor, valor_pago, data_vencimento, data_pagamento,
        mes_referencia, status, metodo_pagamento, observacao,
        imovel:imoveis!inner(apelido, endereco, user_id),
        inquilino:inquilinos(nome, email)
      `)
      .eq('id', params.id)
      .single()

    if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })

    const imovel = aluguel.imovel as { apelido: string; endereco: string; user_id: string } | null
    if (imovel?.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (aluguel.status !== 'pago') {
      return NextResponse.json({ error: 'Recibo disponível apenas para aluguéis pagos' }, { status: 400 })
    }

    const inquilino = aluguel.inquilino as { nome: string; email: string | null } | null
    if (!inquilino?.email) {
      return NextResponse.json({ error: 'Inquilino sem e-mail cadastrado' }, { status: 400 })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single()

    await enviarReciboInquilino({
      para: inquilino.email,
      nomeInquilino: inquilino.nome,
      nomeProprietario: profile?.nome ?? 'Proprietário',
      nomeImovel: imovel?.apelido ?? '',
      enderecoImovel: imovel?.endereco ?? '',
      valor: aluguel.valor,
      valorPago: aluguel.valor_pago ?? aluguel.valor,
      mesReferencia: aluguel.mes_referencia,
      dataVencimento: aluguel.data_vencimento,
      dataPagamento: aluguel.data_pagamento ?? '',
      metodoPagamento: aluguel.metodo_pagamento ?? null,
      observacao: aluguel.observacao ?? null,
    })

    await admin
      .from('alugueis')
      .update({ recibo_reenviado_em: new Date().toISOString() })
      .eq('id', params.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao reenviar recibo', detail: String(err) }, { status: 500 })
  }
}
