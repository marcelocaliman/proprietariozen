import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const PRECO_MASTER = 49.90
const PRECO_ELITE  = 99.90

function mrrPorPlano(plano: string): number {
  if (plano === 'elite') return PRECO_ELITE
  if (plano === 'pago')  return PRECO_MASTER
  return 0
}

function mesLabel(year: number, month: number) {
  return new Date(year, month - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '').replace(' de ', '/')
    .replace(/^(\w)/, c => c.toUpperCase())
}

// GET /api/admin/financeiro
export async function GET() {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminSupabaseClient()

  // Buscar todos os profiles (apenas criado_em + plano — leve)
  const { data: profiles } = await admin
    .from('profiles')
    .select('criado_em, plano')

  const all = profiles ?? []
  const agora = new Date()

  // ── Construir histórico dos últimos 12 meses ───────────────────────────────
  const months = Array.from({ length: 12 }, (_, i) => {
    const offset = 11 - i  // 11 meses atrás → mês atual
    const year  = agora.getMonth() - offset < 0
      ? agora.getFullYear() - 1
      : agora.getFullYear()
    const month = ((agora.getMonth() - offset) % 12 + 12) % 12 + 1
    const fimMes = new Date(year, month, 0, 23, 59, 59) // último dia do mês
    const inicioMes = new Date(year, month - 1, 1)

    // Pagantes acumulados até o fim deste mês (aproximação: sem tracking de downgrade)
    const pagantesAcumulados = all.filter(
      p => (p.plano === 'pago' || p.plano === 'elite') && new Date(p.criado_em) <= fimMes
    )
    const usuariosPro = pagantesAcumulados.length

    // Novos neste mês (total e pagantes)
    const novosMes = all.filter(p => {
      const d = new Date(p.criado_em)
      return d >= inicioMes && d <= fimMes
    })
    const novosTotal = novosMes.length
    const novosPro   = novosMes.filter(p => p.plano === 'pago' || p.plano === 'elite').length

    const mrrBruto   = pagantesAcumulados.reduce((s, p) => s + mrrPorPlano(p.plano), 0)
    const churnValor = 0 // sem tracking de churn

    return {
      mes:          `${year}-${String(month).padStart(2, '0')}`,
      mes_label:    mesLabel(year, month),
      usuarios_pro: usuariosPro,
      novos_pro:    novosPro,
      novos_total:  novosTotal,
      mrr_bruto:    mrrBruto,
      churn_valor:  churnValor,
      mrr_liquido:  mrrBruto - churnValor,
      taxa_conversao: novosTotal > 0
        ? Math.round((novosPro / novosTotal) * 100 * 10) / 10
        : 0,
    }
  })

  // Variação mês a mês
  const monthsWithVariation = months.map((m, i) => {
    const prev = months[i - 1]
    const variacao = prev && prev.mrr_bruto > 0
      ? Math.round(((m.mrr_bruto - prev.mrr_bruto) / prev.mrr_bruto) * 100 * 10) / 10
      : 0
    return { ...m, variacao_pct: variacao }
  })

  // ── Projeções (baseadas na média dos últimos 3 meses) ─────────────────────
  const last3 = monthsWithVariation.slice(-3)
  const avgGrowthPct = last3.reduce((s, m) => s + m.variacao_pct, 0) / 3
  const mrrAtual = monthsWithVariation[monthsWithVariation.length - 1]?.mrr_bruto ?? 0
  const monthlyGrowthFactor = 1 + avgGrowthPct / 100

  function project(months: number) {
    return Math.round(mrrAtual * Math.pow(monthlyGrowthFactor, months))
  }

  // ── Totais ────────────────────────────────────────────────────────────────
  const totalMrrAcumulado = monthsWithVariation.reduce((s, m) => s + m.mrr_bruto, 0)

  return NextResponse.json({
    months: monthsWithVariation,
    projecoes: {
      taxa_crescimento_media: Math.round(avgGrowthPct * 10) / 10,
      mrr_3meses:  project(3),
      mrr_6meses:  project(6),
      mrr_12meses: project(12),
      arr_projetado: project(12) * 12,
    },
    totals: {
      mrr_atual:        mrrAtual,
      arr_atual:        mrrAtual * 12,
      total_acumulado:  totalMrrAcumulado,
      ltv_medio:        monthsWithVariation[monthsWithVariation.length - 1]?.usuarios_pro > 0
        ? Math.round(mrrAtual / monthsWithVariation[monthsWithVariation.length - 1].usuarios_pro * 12)
        : 0,
    },
  })
}
