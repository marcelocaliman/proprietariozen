import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { calcularResumoAnual } from '@/lib/ir'
import type { PlanoTipo } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Autentica via cookie de sessão
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[relatorio-ir] auth error:', authError.message)
      return NextResponse.json({ error: 'Não autorizado', detail: authError.message }, { status: 401 })
    }
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Usa admin client para evitar problemas de RLS nas queries de dados
    const admin = createAdminClient()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('plano, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[relatorio-ir] profile error:', profileError.message, profileError.code)
      return NextResponse.json({ error: 'Erro ao carregar perfil', detail: profileError.message }, { status: 500 })
    }

    const plano = (profile?.role === 'admin' ? 'elite' : profile?.plano ?? 'gratis') as PlanoTipo
    if (plano !== 'elite') {
      return NextResponse.json({ error: 'Disponível apenas no plano Elite' }, { status: 403 })
    }

    const anoParam = req.nextUrl.searchParams.get('ano')
    const anoAtual = new Date().getFullYear()
    const ano = anoParam ? parseInt(anoParam, 10) : anoAtual

    if (isNaN(ano) || ano < 2020 || ano > anoAtual + 1) {
      return NextResponse.json({ error: `Ano inválido: ${ano}` }, { status: 400 })
    }

    // Passo 1 — IDs dos imóveis do usuário
    const { data: imoveis, error: errImoveis } = await admin
      .from('imoveis')
      .select('id')
      .eq('user_id', user.id)

    if (errImoveis) {
      console.error('[relatorio-ir] imoveis error:', errImoveis.message, errImoveis.code)
      return NextResponse.json({ error: 'Erro ao buscar imóveis', detail: errImoveis.message }, { status: 500 })
    }

    const imovelIds = (imoveis ?? []).map(i => i.id)

    if (imovelIds.length === 0) {
      return NextResponse.json(calcularResumoAnual(ano, []))
    }

    // Passo 2 — aluguéis pagos (calcularResumoAnual filtra pelo ano internamente)
    const { data: alugueis, error: errAlugueis } = await admin
      .from('alugueis')
      .select('mes_referencia, valor, valor_pago')
      .in('imovel_id', imovelIds)
      .eq('status', 'pago')

    if (errAlugueis) {
      console.error('[relatorio-ir] alugueis error:', errAlugueis.message, errAlugueis.code, JSON.stringify(errAlugueis))
      return NextResponse.json({ error: 'Erro ao buscar aluguéis', detail: errAlugueis.message }, { status: 500 })
    }

    const registros = (alugueis ?? []).map(a => ({
      mes_referencia: a.mes_referencia,
      valor: a.valor,
      valor_pago: a.valor_pago,
    }))

    const resumo = calcularResumoAnual(ano, registros)
    return NextResponse.json(resumo)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[relatorio-ir] exceção:', msg)
    return NextResponse.json({ error: 'Erro interno do servidor', detail: msg }, { status: 500 })
  }
}
