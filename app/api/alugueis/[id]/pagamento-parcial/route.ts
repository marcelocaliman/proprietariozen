import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json() as { valorPago?: number; dataPagamento?: string; observacao?: string }
    const { valorPago, dataPagamento, observacao } = body

    if (!valorPago || valorPago <= 0) {
      return NextResponse.json({ error: 'Informe um valor válido' }, { status: 400 })
    }
    if (!dataPagamento) {
      return NextResponse.json({ error: 'Informe a data de recebimento' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: aluguel } = await admin
      .from('alugueis')
      .select('id, valor, imovel:imoveis!inner(user_id)')
      .eq('id', params.id)
      .single()

    if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })

    const imovel = aluguel.imovel as { user_id: string } | null
    if (imovel?.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (valorPago >= aluguel.valor) {
      return NextResponse.json({ error: 'Para pagamento total, use "Registrar pagamento"' }, { status: 400 })
    }

    const novaObs = observacao
      ? `Pagamento parcial de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorPago)} em ${new Date(dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}${observacao ? `: ${observacao}` : ''}`
      : `Pagamento parcial de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorPago)} em ${new Date(dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}`

    const { error: dbErr } = await admin
      .from('alugueis')
      .update({ valor_pago: valorPago, observacao: novaObs })
      .eq('id', params.id)

    if (dbErr) return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })

    return NextResponse.json({ ok: true, valor_pago: valorPago, observacao: novaObs })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 })
  }
}
