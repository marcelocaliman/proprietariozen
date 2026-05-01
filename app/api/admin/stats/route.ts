import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const PRECO_MASTER = 49.90
const PRECO_ELITE  = 99.90

type ProfileRow = { id: string; plano: string; criado_em: string; atualizado_em: string }
type ActivityRow = { id: string; user_id: string | null; user_email: string | null; user_nome: string | null; action: string; details: unknown; ip_address: string | null; created_at: string }

// ── Helpers de data ───────────────────────────────────────────────────────────

function startOf(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}
function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000)
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function shortLabel(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '').replace(' de ', '/')
}

// GET /api/admin/stats
export async function GET() {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminSupabaseClient()

  const agora = new Date()
  const hoje = startOf(agora)
  const ha7Dias = addDays(hoje, -6)
  const ha30Dias = addDays(hoje, -29)
  const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59)
  // String YYYY-MM-01 construída sem Date.toISOString() para evitar bug de timezone
  const mesAtualStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`

  // ── activity_logs com JOIN em profiles para mostrar email/nome ───────────────
  type RawActivity = {
    id: string
    user_id: string | null
    action: string
    details: unknown
    ip_address: string | null
    created_at: string
    profiles: { nome: string | null; email: string | null } | null
  }
  let activityData: ActivityRow[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logsTable = admin.from('activity_logs' as never) as any
  const { data: rawActivity, error: actErr } = await logsTable
    .select('id, user_id, action, details, ip_address, created_at, profiles!activity_logs_user_id_fkey(nome, email)')
    .order('created_at', { ascending: false })
    .limit(20) as { data: RawActivity[] | null; error: { message: string } | null }
  if (actErr) console.error('[stats] activity_logs:', actErr.message)
  activityData = (rawActivity ?? []).map(r => ({
    id:         r.id,
    user_id:    r.user_id,
    user_email: r.profiles?.email ?? null,
    user_nome:  r.profiles?.nome ?? null,
    action:     r.action,
    details:    r.details,
    ip_address: r.ip_address,
    created_at: r.created_at,
  }))

  // ── Queries paralelas ────────────────────────────────────────────────────────
  const [
    { data: rawProfiles },
    { count: totalImoveis },
    { count: totalInquilinos },
    { count: totalAlugueisMes },
    { count: atrasadosCount },
    { data: receitaData },
  ] = await Promise.all([
    admin.from('profiles').select('id, plano, criado_em, atualizado_em'),
    admin.from('imoveis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    admin.from('inquilinos').select('*', { count: 'exact', head: true }).eq('ativo', true),
    admin.from('alugueis')
      .select('*', { count: 'exact', head: true })
      .eq('mes_referencia', mesAtualStr)
      .neq('status', 'cancelado')
      .neq('status', 'estornado'),
    admin.from('alugueis')
      .select('*', { count: 'exact', head: true })
      .eq('mes_referencia', mesAtualStr)
      .eq('status', 'atrasado'),
    admin.from('alugueis')
      .select('valor')
      .eq('mes_referencia', mesAtualStr)
      .eq('status', 'pago'),
  ])

  const profiles = (rawProfiles ?? []) as ProfileRow[]

  // ── Métricas de usuários ──────────────────────────────────────────────────
  const total          = profiles.length
  const masterProfiles = profiles.filter((p: ProfileRow) => p.plano === 'pago')
  const eliteProfiles  = profiles.filter((p: ProfileRow) => p.plano === 'elite')
  const proProfiles    = [...masterProfiles, ...eliteProfiles]
  const totalPro       = proProfiles.length
  const totalMaster    = masterProfiles.length
  const totalElite     = eliteProfiles.length
  const totalGratis    = total - totalPro

  const novosHoje    = profiles.filter((p: ProfileRow) => new Date(p.criado_em) >= hoje).length
  const novosSemana  = profiles.filter((p: ProfileRow) => new Date(p.criado_em) >= ha7Dias).length
  const novosMes     = profiles.filter((p: ProfileRow) => new Date(p.criado_em) >= inicioMesAtual).length
  const novosMesAnt  = profiles.filter((p: ProfileRow) => {
    const d = new Date(p.criado_em)
    return d >= inicioMesAnterior && d <= fimMesAnterior
  }).length
  const ativos30d    = profiles.filter((p: ProfileRow) => new Date(p.atualizado_em) >= ha30Dias).length

  const crescimentoVsMes = novosMesAnt > 0
    ? Math.round(((novosMes - novosMesAnt) / novosMesAnt) * 100)
    : novosMes > 0 ? 100 : 0

  // ── MRR ──────────────────────────────────────────────────────────────────
  const mrrAtual = totalMaster * PRECO_MASTER + totalElite * PRECO_ELITE

  const masterMesAnt = masterProfiles.filter(
    (p: ProfileRow) => new Date(p.criado_em) < inicioMesAtual
  ).length
  const eliteMesAnt = eliteProfiles.filter(
    (p: ProfileRow) => new Date(p.criado_em) < inicioMesAtual
  ).length
  const mrrMesAnt = masterMesAnt * PRECO_MASTER + eliteMesAnt * PRECO_ELITE
  const crescimentoMrr = mrrMesAnt > 0
    ? Math.round(((mrrAtual - mrrMesAnt) / mrrMesAnt) * 100)
    : mrrAtual > 0 ? 100 : 0

  // ── Série de crescimento — últimos 30 dias ───────────────────────────────
  const diasTotal    = profiles.filter((p: ProfileRow) => new Date(p.criado_em) < ha30Dias).length
  const diasTotalPro = proProfiles.filter((p: ProfileRow) => new Date(p.criado_em) < ha30Dias).length

  const growth_series = Array.from({ length: 30 }, (_, i) => {
    const dia    = addDays(ha30Dias, i)
    const diaStr = isoDate(dia)
    const novosNoDia    = profiles.filter((p: ProfileRow) => isoDate(new Date(p.criado_em)) === diaStr).length
    const novosProNoDia = proProfiles.filter((p: ProfileRow) => isoDate(new Date(p.criado_em)) === diaStr).length
    return { date: diaStr, label: shortLabel(dia), count: novosNoDia, countPro: novosProNoDia }
  }).reduce<{ date: string; label: string; total: number; pro: number }[]>((acc, item, i) => {
    const prev = acc[i - 1]
    acc.push({
      date:  item.date,
      label: item.label,
      total: (prev?.total ?? diasTotal) + item.count,
      pro:   (prev?.pro   ?? diasTotalPro) + item.countPro,
    })
    return acc
  }, [])

  // ── Receita do mês ────────────────────────────────────────────────────────
  const receitaMes = (receitaData ?? []).reduce(
    (s: number, r: { valor: number | null }) => s + (r.valor ?? 0),
    0,
  )
  const total_mes   = totalAlugueisMes ?? 0
  const taxaInadimp = total_mes > 0
    ? Math.round(((atrasadosCount ?? 0) / total_mes) * 100)
    : 0

  return NextResponse.json({
    users: {
      total,
      total_gratis:                totalGratis,
      total_master:                totalMaster,
      total_elite:                 totalElite,
      total_pro:                   totalPro,
      usuarios_ativos_30d:         ativos30d,
      novos_hoje:                  novosHoje,
      novos_semana:                novosSemana,
      novos_mes:                   novosMes,
      crescimento_vs_mes_anterior: crescimentoVsMes,
      taxa_conversao:              total > 0 ? Math.round((totalPro / total) * 100 * 10) / 10 : 0,
      churn_mes:                   0,
    },
    app: {
      total_imoveis:      totalImoveis    ?? 0,
      total_inquilinos:   totalInquilinos ?? 0,
      total_alugueis_mes: total_mes,
      total_recebido_mes: receitaMes,
      taxa_inadimplencia: taxaInadimp,
    },
    mrr: {
      mrr_atual:        mrrAtual,
      mrr_mes_anterior: mrrMesAnt,
      crescimento_mrr:  crescimentoMrr,
      arr:              mrrAtual * 12,
      ltv_medio:        totalPro > 0 ? Math.round((mrrAtual / totalPro) * 12) : 0,
    },
    growth_series,
    recent_activity: activityData,
  })
}
