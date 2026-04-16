import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// GET /api/cron/gerar-alugueis
// Gera registros mensais de aluguel para todos os imóveis ativos de todos os usuários.
// Dispara no dia 1 de cada mês às 08:00 BRT (11:00 UTC) via Vercel Cron.
// Protegido por CRON_SECRET.

function calcularVencimento(mesReferencia: string, diaVencimento: number): string {
  const [anoStr, mesStr] = mesReferencia.split('-')
  const ano = parseInt(anoStr)
  const mes = parseInt(mesStr)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const dia = Math.min(diaVencimento, ultimoDia)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

type ImovelRow = {
  id: string
  valor_aluguel: number
  dia_vencimento: number
  data_inicio_contrato: string | null
  inquilinos: { id: string; ativo: boolean }[]
}

export async function GET(req: NextRequest) {
  // ── Autenticação ──────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization') ?? ''
    const querySecret = req.nextUrl.searchParams.get('secret') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : querySecret
    if (token !== secret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  }

  const admin = createAdminClient()

  // Mês de referência = primeiro dia do mês atual
  const hoje = new Date()
  const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const mesStr = mesReferencia.slice(0, 7) // YYYY-MM

  // Busca todos os imóveis ativos com inquilinos
  const { data: imoveis, error: errImoveis } = await admin
    .from('imoveis')
    .select('id, valor_aluguel, dia_vencimento, data_inicio_contrato, inquilinos(id, ativo)')
    .eq('ativo', true) as unknown as { data: ImovelRow[] | null; error: unknown }

  if (errImoveis || !imoveis) {
    return NextResponse.json({ error: 'Falha ao buscar imóveis', detail: String(errImoveis) }, { status: 500 })
  }

  // Filtra imóveis cujo contrato já começou
  const imoveisValidos = imoveis.filter(imovel => {
    if (!imovel.data_inicio_contrato) return true
    return imovel.data_inicio_contrato.slice(0, 7) <= mesStr
  })

  if (!imoveisValidos.length) {
    return NextResponse.json({ ok: true, mes: mesStr, criados: 0, message: 'Nenhum imóvel elegível' })
  }

  // Quais já têm aluguel neste mês?
  const imovelIds = imoveisValidos.map(i => i.id)
  const { data: existentes } = await admin
    .from('alugueis')
    .select('imovel_id')
    .in('imovel_id', imovelIds)
    .eq('mes_referencia', mesReferencia)

  const existentesSet = new Set(existentes?.map(a => a.imovel_id) ?? [])

  const novos = imoveisValidos
    .filter(imovel => !existentesSet.has(imovel.id))
    .map(imovel => {
      const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
      return {
        imovel_id: imovel.id,
        inquilino_id: inquilinoAtivo?.id ?? null,
        mes_referencia: mesReferencia,
        valor: imovel.valor_aluguel,
        data_vencimento: calcularVencimento(mesStr, imovel.dia_vencimento),
        status: 'pendente' as const,
      }
    })

  if (!novos.length) {
    return NextResponse.json({ ok: true, mes: mesStr, criados: 0, message: 'Todos os aluguéis já existem' })
  }

  const { error: errInsert } = await admin.from('alugueis').insert(novos)
  if (errInsert) {
    return NextResponse.json({ error: 'Falha ao inserir aluguéis', detail: String(errInsert) }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    executado_em: new Date().toISOString(),
    mes: mesStr,
    criados: novos.length,
    elegíveis: imoveisValidos.length,
    já_existiam: existentesSet.size,
  })
}
