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

    const body = await req.json() as { valorDesconto?: number; motivo?: string }
    const { valorDesconto, motivo } = body

    if (!valorDesconto || valorDesconto <= 0) {
      return NextResponse.json({ error: 'Informe um valor de desconto válido' }, { status: 400 })
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

    if (valorDesconto >= aluguel.valor) {
      return NextResponse.json({ error: 'Desconto não pode ser maior ou igual ao valor do aluguel. Use "Isentar mês" para valor zero.' }, { status: 400 })
    }

    const novaObs = motivo || null

    const { error: dbErr } = await admin
      .from('alugueis')
      .update({ desconto: valorDesconto, observacao: novaObs })
      .eq('id', params.id)

    if (dbErr) return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })

    return NextResponse.json({ ok: true, desconto: valorDesconto, observacao: novaObs })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 })
  }
}
