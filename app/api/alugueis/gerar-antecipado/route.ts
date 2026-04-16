import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/alugueis/gerar-antecipado
// Cria um registro de aluguel para um mês FUTURO mediante confirmação explícita
// do proprietário. A geração automática (gerarAlugueisMes) nunca cria futuros;
// este endpoint é o único caminho para criar antecipados.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json() as {
      imovelId: string
      inquilinoId: string | null
      mesReferencia: string  // 'YYYY-MM-01'
      valor: number
      dataVencimento: string // 'YYYY-MM-DD'
    }

    const { imovelId, inquilinoId, mesReferencia, valor, dataVencimento } = body

    if (!imovelId || !mesReferencia || !valor || !dataVencimento) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // Apenas para meses futuros — meses passados e atual usam a geração normal
    const hoje = new Date()
    const mesAtualRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
    if (mesReferencia <= mesAtualRef) {
      return NextResponse.json(
        { error: 'Use a geração normal para o mês atual ou passados' },
        { status: 400 },
      )
    }

    // Verifica ownership (RLS + query explícita)
    const { data: imovel } = await supabase
      .from('imoveis')
      .select('id')
      .eq('id', imovelId)
      .eq('user_id', user.id)
      .single()
    if (!imovel) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    }

    // Verifica duplicata (constraint única imovel_id + mes_referencia)
    const { data: existente } = await supabase
      .from('alugueis')
      .select('id')
      .eq('imovel_id', imovelId)
      .eq('mes_referencia', mesReferencia)
      .maybeSingle()
    if (existente) {
      return NextResponse.json(
        { error: 'Cobrança já existe para este mês' },
        { status: 409 },
      )
    }

    // Verifica que o imóvel tem inquilino ativo (se inquilinoId fornecido)
    if (inquilinoId) {
      const { data: inq } = await supabase
        .from('inquilinos')
        .select('id')
        .eq('id', inquilinoId)
        .eq('imovel_id', imovelId)
        .eq('ativo', true)
        .maybeSingle()
      if (!inq) {
        return NextResponse.json({ error: 'Inquilino ativo não encontrado' }, { status: 400 })
      }
    }

    const { data: novoAluguel, error: insertErr } = await supabase
      .from('alugueis')
      .insert({
        imovel_id: imovelId,
        inquilino_id: inquilinoId ?? null,
        mes_referencia: mesReferencia,
        valor,
        data_vencimento: dataVencimento,
        status: 'pendente',
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, aluguel: novoAluguel })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 })
  }
}
