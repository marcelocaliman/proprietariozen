import Link from 'next/link'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { detectarPendenciasCobranca } from '@/lib/cobranca-health'
import { CobrancaHealthCard } from '@/components/dashboard/cobranca-health-card'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { StatCard } from '@/components/dashboard/stat-card'
import { ReajusteAlertas } from '@/components/dashboard/reajuste-alertas'
import { MonthSelector } from '@/components/dashboard/month-selector'
import { AluguelAcaoBtn } from '@/components/dashboard/aluguel-acao-btn'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import type { RevenueDataPoint } from '@/components/dashboard/revenue-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, CheckCircle, AlertCircle, Building2,
  Calendar, Banknote, Activity, ArrowRight, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { UpgradePrompt } from '@/components/dashboard/upgrade-prompt'
import { LIMITES_PLANO } from '@/lib/stripe'

const STATUS_CONFIG = {
  pago:     { label: 'Pago',     badgeCls: 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]' },
  pendente: { label: 'Pendente', badgeCls: 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]' },
  atrasado: { label: 'Atrasado', badgeCls: 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2]' },
} as const

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
]

const ATIVIDADE_ICON_CONFIG = {
  pagamento: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  imovel:    { bg: 'bg-blue-100',    text: 'text-blue-600' },
  inquilino: { bg: 'bg-violet-100',  text: 'text-violet-600' },
  reajuste:  { bg: 'bg-amber-100',   text: 'text-amber-600' },
}

function corAvatar(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length]
}

function diasAtraso(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const agora = new Date(); agora.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((agora.getTime() - venc.getTime()) / 86_400_000))
}

function diasParaVencer(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const agora = new Date(); agora.setHours(0, 0, 0, 0)
  return Math.ceil((venc.getTime() - agora.getTime()) / 86_400_000)
}

function tempoRelativo(data: string): string {
  const d = new Date(data.includes('T') ? data : data + 'T00:00:00')
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  const horas = Math.floor(diff / 3_600_000)
  const dias = Math.floor(diff / 86_400_000)
  if (mins < 60) return `há ${mins} min`
  if (horas < 24) return `há ${horas} hora${horas !== 1 ? 's' : ''}`
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return formatarData(data)
}

function urgenciaBadge(dias: number, status: string): { cls: string; label: string } {
  if (status === 'atrasado') {
    const d = diasAtraso(/* we pass dias as negative here */ '')
    void d
    return { cls: 'bg-red-100 text-red-700', label: 'Atrasado' }
  }
  if (dias <= 2) return { cls: 'bg-red-100 text-red-700',   label: `${dias}d` }
  if (dias <= 4) return { cls: 'bg-amber-100 text-amber-700', label: `${dias}d` }
  return          { cls: 'bg-slate-100 text-slate-600',      label: `${dias}d` }
}

function calcTrend(
  atual: number,
  anterior: number,
): { percentual: number; positivo: boolean } | null {
  if (anterior === 0) return null
  const diff = ((atual - anterior) / anterior) * 100
  return { percentual: Math.abs(Math.round(diff)), positivo: diff >= 0 }
}

type AluguelTotais = { valor: number; status: string }

type AluguelLista = {
  id: string
  valor: number
  status: string
  data_vencimento: string
  data_pagamento: string | null
  mes_referencia: string
  imovel: { apelido: string; user_id: string } | null
  inquilino: { nome: string } | null
}

type AluguelAtividade = {
  id: string
  valor: number
  data_pagamento: string | null
  mes_referencia: string
  imovel: { apelido: string } | null
  inquilino: { nome: string } | null
}

type AluguelReceita = {
  valor: number
  mes_referencia: string
  imovel: { user_id: string } | null
}

type ImovelParaPreview = {
  id: string
  apelido: string
  valor_aluguel: number
  dia_vencimento: number
  data_inicio_contrato: string | null
  inquilinos: { nome: string; ativo: boolean }[]
}

type ImovelContratoPrev = {
  id: string
  apelido: string
  data_fim_contrato: string
  inquilinos: { nome: string; ativo: boolean }[]
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()
  const pixKey = (user.user_metadata?.pix_key as string | null) ?? null
  const pendenciasCobranca = await detectarPendenciasCobranca(admin, user.id, pixKey)

  const hoje = new Date()

  // Parse selected month from ?mes=YYYY-MM
  let selectedYear = hoje.getFullYear()
  let selectedMonth = hoje.getMonth() + 1

  const rawMes = searchParams?.mes
  if (rawMes && /^\d{4}-\d{2}$/.test(rawMes)) {
    const [y, m] = rawMes.split('-').map(Number)
    if (m >= 1 && m <= 12) { selectedYear = y; selectedMonth = m }
  }

  const mesAtual = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const selectedMesKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  // Previous month for trend
  const prevDate = new Date(selectedYear, selectedMonth - 2, 1)
  const mesPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`

  // 6 months back for revenue chart
  const sixMonthsAgo = new Date(selectedYear, selectedMonth - 7, 1)
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

  const em7Dias = new Date(hoje); em7Dias.setDate(hoje.getDate() + 7)
  const em30Dias = new Date(hoje); em30Dias.setDate(hoje.getDate() + 30)
  const em60Dias = new Date(hoje); em60Dias.setDate(hoje.getDate() + 60)

  const [
    { data: profile },
    { data: alugueisMes },
    { data: alugueisMesPrev },
    { data: alugueisList },
    { data: imoveisAtivos },
    { data: proximosVencimentos },
    { data: proximosReajustes },
    { data: atividadeRecente },
    { data: receitaMeses },
    { data: imoveisParaPreview },
    { data: contratosVencendo },
  ] = await Promise.all([
    supabase.from('profiles').select('nome, plano, role').eq('id', user.id).single(),

    // Totais do mês selecionado
    supabase.from('alugueis')
      .select('valor, status, imovel:imoveis!inner(user_id)')
      .eq('mes_referencia', mesAtual)
      .eq('imovel.user_id', user.id) as unknown as Promise<{ data: AluguelTotais[] | null; error: unknown }>,

    // Totais do mês anterior (para tendência)
    supabase.from('alugueis')
      .select('valor, status, imovel:imoveis!inner(user_id)')
      .eq('mes_referencia', mesPrev)
      .eq('imovel.user_id', user.id) as unknown as Promise<{ data: AluguelTotais[] | null; error: unknown }>,

    // Lista detalhada do mês selecionado (exclui cancelados/estornados)
    supabase.from('alugueis')
      .select('id, valor, status, data_vencimento, data_pagamento, mes_referencia, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('mes_referencia', mesAtual)
      .eq('imovel.user_id', user.id)
      .neq('status', 'cancelado')
      .neq('status', 'estornado')
      .order('data_vencimento', { ascending: true })
      .limit(8) as unknown as Promise<{ data: AluguelLista[] | null; error: unknown }>,

    // Imóveis ativos
    supabase.from('imoveis').select('id').eq('user_id', user.id).eq('ativo', true),

    // Próximos vencimentos (7 dias) — sempre baseado em hoje
    supabase.from('alugueis')
      .select('id, valor, data_vencimento, status, mes_referencia, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('imovel.user_id', user.id)
      .in('status', ['pendente', 'atrasado'])
      .lte('data_vencimento', em7Dias.toISOString().split('T')[0])
      .order('data_vencimento', { ascending: true })
      .limit(4) as unknown as Promise<{ data: AluguelLista[] | null; error: unknown }>,

    // Reajustes próximos
    supabase.from('imoveis')
      .select('id, apelido, data_proximo_reajuste, valor_aluguel, indice_reajuste, percentual_fixo')
      .eq('user_id', user.id).eq('ativo', true)
      .not('data_proximo_reajuste', 'is', null)
      .lte('data_proximo_reajuste', em30Dias.toISOString().split('T')[0])
      .gte('data_proximo_reajuste', hoje.toISOString().split('T')[0])
      .order('data_proximo_reajuste', { ascending: true })
      .limit(5),

    // Atividade recente (últimos pagamentos)
    supabase.from('alugueis')
      .select('id, valor, data_pagamento, mes_referencia, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('status', 'pago')
      .eq('imovel.user_id', user.id)
      .not('data_pagamento', 'is', null)
      .order('data_pagamento', { ascending: false })
      .limit(5) as unknown as Promise<{ data: AluguelAtividade[] | null; error: unknown }>,

    // Receita dos últimos 6 meses para gráfico
    supabase.from('alugueis')
      .select('valor, mes_referencia, imovel:imoveis!inner(user_id)')
      .eq('status', 'pago')
      .eq('imovel.user_id', user.id)
      .gte('mes_referencia', sixMonthsAgoStr)
      .lte('mes_referencia', mesAtual) as unknown as Promise<{ data: AluguelReceita[] | null; error: unknown }>,

    // Imóveis para preview de cobranças futuras
    supabase.from('imoveis')
      .select('id, apelido, valor_aluguel, dia_vencimento, data_inicio_contrato, inquilinos(nome, ativo)')
      .eq('user_id', user.id)
      .eq('ativo', true) as unknown as Promise<{ data: ImovelParaPreview[] | null; error: unknown }>,

    // Contratos próximos do vencimento (≤ 60 dias)
    supabase.from('imoveis')
      .select('id, apelido, data_fim_contrato, inquilinos(nome, ativo)')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .eq('contrato_indeterminado', false)
      .not('data_fim_contrato', 'is', null)
      .lte('data_fim_contrato', em60Dias.toISOString().split('T')[0])
      .gte('data_fim_contrato', hoje.toISOString().split('T')[0])
      .order('data_fim_contrato', { ascending: true })
      .limit(5) as unknown as Promise<{ data: ImovelContratoPrev[] | null; error: unknown }>,
  ])

  // Totais do mês selecionado
  // "A receber" = apenas pendente + atrasado (o que ainda não entrou no caixa)
  const totalReceber  = alugueisMes?.filter(a => a.status === 'pendente' || a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const totalRecebido = alugueisMes?.filter(a => a.status === 'pago').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const totalAtrasado = alugueisMes?.filter(a => a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const qtdImoveisAtivos = imoveisAtivos?.length ?? 0
  const qtdPagos     = alugueisMes?.filter(a => a.status === 'pago').length ?? 0
  const qtdAtrasados = alugueisMes?.filter(a => a.status === 'atrasado').length ?? 0
  const qtdPendentes = alugueisMes?.filter(a => a.status === 'pendente').length ?? 0

  // Totais do mês anterior para tendência
  const prevReceber  = alugueisMesPrev?.filter(a => a.status === 'pendente' || a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const prevRecebido = alugueisMesPrev?.filter(a => a.status === 'pago').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const prevAtrasado = alugueisMesPrev?.filter(a => a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0

  const trendReceber  = calcTrend(totalReceber, prevReceber)
  const trendRecebido = calcTrend(totalRecebido, prevRecebido)
  const trendAtrasado = calcTrend(totalAtrasado, prevAtrasado)

  // Cobranças previstas para os próximos 2 meses
  type ItemPreview = { apelido: string; inquilino: string; valor: number; dia: number }
  type MesPreview  = { mes: string; mesLabel: string; total: number; items: ItemPreview[] }

  const proximasCobrancas: MesPreview[] = [1, 2].map(delta => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + delta, 1)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    const items: ItemPreview[] = (imoveisParaPreview ?? [])
      .filter(imovel => {
        if (!imovel.data_inicio_contrato) return true
        return mes >= imovel.data_inicio_contrato.slice(0, 7)
      })
      .map(imovel => ({
        apelido:    imovel.apelido,
        inquilino:  imovel.inquilinos?.find(i => i.ativo)?.nome ?? 'Sem inquilino',
        valor:      imovel.valor_aluguel,
        dia:        imovel.dia_vencimento,
      }))
    return {
      mes,
      mesLabel: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
      total:    items.reduce((s, i) => s + i.valor, 0),
      items,
    }
  }).filter(m => m.items.length > 0)

  // Saudação
  const horaLocal = (hoje.getUTCHours() - 3 + 24) % 24
  const saudacao = horaLocal < 12 ? 'Bom dia' : horaLocal < 18 ? 'Boa tarde' : 'Boa noite'
  const profileTyped = profile as { nome?: string; plano?: 'gratis' | 'pago' | 'elite'; role?: string } | null
  const primeiroNome = profileTyped?.nome?.split(' ')[0] ?? ''

  // Upgrade prompt: só para grátis e não-admin que tem 2+ imóveis
  const isGratisNaoAdmin = profileTyped?.plano === 'gratis' && profileTyped?.role !== 'admin'
  const limiteGratis = LIMITES_PLANO.gratis.imoveis
  const upgradeVariant: 'near_limit' | 'at_limit' | null =
    !isGratisNaoAdmin || qtdImoveisAtivos < 2
      ? null
      : qtdImoveisAtivos >= limiteGratis
        ? 'at_limit'
        : 'near_limit'

  // Label do mês selecionado
  const labelMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(selectedYear, selectedMonth - 1, 1))
  const labelMesCap = labelMes.charAt(0).toUpperCase() + labelMes.slice(1)

  // Revenue chart data — group by month
  const revenueByMonth: Record<string, number> = {}
  receitaMeses?.forEach(a => {
    const key = a.mes_referencia.substring(0, 7)
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (a.valor ?? 0)
  })

  const chartData: RevenueDataPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth - 1 - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    return {
      mes: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', ''),
      mesLabel: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
      total: revenueByMonth[key] ?? 0,
    }
  })

  // Vencimentos visíveis (máx 3 + "Ver mais")
  const vencimentosVisiveis = (proximosVencimentos ?? []).slice(0, 3)
  const temMaisVencimentos = (proximosVencimentos?.length ?? 0) > 3

  // Indicadores secundários para o hero
  const pctRecebido = (totalReceber + totalRecebido + totalAtrasado) > 0
    ? Math.round((totalRecebido / (totalReceber + totalRecebido + totalAtrasado)) * 100)
    : 0

  // Onboarding state: nenhum imóvel cadastrado → focar 100% na ativação
  if (qtdImoveisAtivos === 0) {
    return (
      <div className="space-y-7 max-w-[1400px] mx-auto">
        <div>
          <p className="text-sm text-slate-500 font-medium">
            {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''}!
          </p>
          <h1
            className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
          >
            Bem-vindo ao ProprietárioZen
          </h1>
        </div>
        <EmptyState
          icon={Building2}
          title="Vamos cadastrar seu primeiro imóvel"
          description="Em menos de 2 minutos seu app está pronto: cadastra o imóvel, vincula o inquilino e o ProprietárioZen passa a gerar e cobrar os aluguéis automaticamente."
          primaryCta={{
            label: 'Cadastrar primeiro imóvel',
            href: '/imoveis',
            icon: Building2,
          }}
          secondaryCta={{
            label: 'Ver planos',
            href: '/planos',
          }}
          steps={[
            { title: 'Cadastre o imóvel', desc: 'Endereço, valor, dia de vencimento e índice de reajuste.' },
            { title: 'Vincule o inquilino', desc: 'Dados básicos e, se quiser, convide para a área dele.' },
            { title: 'Cobre automaticamente', desc: 'PIX/boleto manual ou automático via Asaas — o app dispara.' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      {/* ── HEADER ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-slate-500 font-medium">
            {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''}
          </p>
          <h1
            className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
          >
            {labelMesCap}
          </h1>
        </div>
        <MonthSelector value={selectedMesKey} />
      </div>

      {/* ── UPGRADE PROMPT (grátis, não-admin, 2+ imóveis) ── */}
      {upgradeVariant && (
        <UpgradePrompt
          variant={upgradeVariant}
          imoveis={qtdImoveisAtivos}
          limite={limiteGratis}
        />
      )}

      {/* ── HEALTH ── */}
      <CobrancaHealthCard issues={pendenciasCobranca} />

      {/* ── HERO METRIC + STATS ── */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Hero — Recebido em destaque */}
        <div
          className="lg:col-span-3 rounded-2xl p-7 relative overflow-hidden text-white flex flex-col justify-between min-h-[200px]"
          style={{
            background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
            boxShadow: '0 8px 32px rgba(5, 150, 105, 0.25)',
          }}
        >
          {/* Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.18)', filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'rgba(52, 211, 153, 0.10)', filter: 'blur(60px)' }} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-emerald-200">
                Recebido este mês
              </p>
              {trendRecebido && (
                <div className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                  trendRecebido.positivo ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200',
                )}>
                  {trendRecebido.positivo ? <TrendingUp className="h-3 w-3" /> : null}
                  {trendRecebido.positivo ? '+' : '−'}{trendRecebido.percentual}%
                </div>
              )}
            </div>
            <p
              className="font-extrabold leading-none mt-1"
              style={{
                fontSize: 'clamp(36px, 4.5vw, 56px)',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #6EE7B7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.025em',
              }}
            >
              {formatarMoeda(totalRecebido)}
            </p>
          </div>

          <div className="relative z-10 mt-5 space-y-3">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] text-emerald-200/80 mb-1.5">
                <span>{pctRecebido}% do esperado</span>
                <span>{qtdPagos} pago{qtdPagos !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pctRecebido}%`,
                    background: 'linear-gradient(90deg, #34D399, #6EE7B7)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats secundários */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            titulo="A receber"
            valor={formatarMoeda(totalReceber)}
            descricao={totalReceber === 0 ? 'tudo recebido' : `${qtdPendentes + qtdAtrasados} pendente${qtdPendentes + qtdAtrasados !== 1 ? 's' : ''}`}
            icon={TrendingUp}
            cor="padrao"
            todoEmDia={totalReceber === 0}
            zeroText="Tudo recebido"
            tendencia={trendReceber}
          />
          <StatCard
            titulo="Em atraso"
            valor={formatarMoeda(totalAtrasado)}
            descricao={`${qtdAtrasados} pagamento${qtdAtrasados !== 1 ? 's' : ''}`}
            icon={AlertCircle}
            cor="vermelho"
            todoEmDia={totalAtrasado === 0}
            tendencia={trendAtrasado}
          />
          <StatCard
            titulo="Imóveis ativos"
            valor={String(qtdImoveisAtivos)}
            descricao="cadastrados e ativos"
            icon={Building2}
            cor="padrao"
          />
        </div>
      </div>

      {/* ── MAIN 2-COL ── */}
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        {/* Coluna esquerda — Aluguéis do mês */}
        <Card className="flex flex-col rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-0 pt-5 px-6">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600" />Aluguéis do mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2 flex-1">
            {!alugueisList?.length ? (
              <p className="px-5 py-6 text-sm text-[#94A3B8] text-center">Nenhum aluguel neste mês.</p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {alugueisList.map(aluguel => {
                  const st = STATUS_CONFIG[aluguel.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendente
                  const atraso = aluguel.status === 'atrasado' ? diasAtraso(aluguel.data_vencimento) : 0
                  const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                  const iniciais = nomeInq.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                  const isPago = aluguel.status === 'pago'

                  return (
                    <div
                      key={aluguel.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      {/* Coluna 1: avatar + nome + imóvel */}
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0', corAvatar(nomeInq))}>
                        {iniciais}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate leading-tight">{nomeInq}</p>
                        <p className="text-xs text-slate-400 truncate leading-tight">{aluguel.imovel?.apelido}</p>
                      </div>

                      {/* Coluna 2: data vencimento */}
                      <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0 w-24 justify-end">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {aluguel.data_pagamento
                          ? <span className="text-emerald-600">{formatarData(aluguel.data_pagamento)}</span>
                          : formatarData(aluguel.data_vencimento)
                        }
                      </div>

                      {/* Coluna 3: badge status */}
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        <Badge className={cn('text-xs font-semibold', st.badgeCls)}>{st.label}</Badge>
                        {atraso > 0 && <span className="text-[10px] text-[#991B1B] font-medium">{atraso}d</span>}
                      </div>

                      {/* Coluna 4: valor */}
                      <div className={cn(
                        'text-sm font-bold shrink-0 w-20 text-right',
                        isPago ? 'text-emerald-600' : 'text-slate-600',
                      )}>
                        {formatarMoeda(aluguel.valor)}
                      </div>

                      {/* Coluna 5: ação rápida */}
                      <div className="shrink-0">
                        <AluguelAcaoBtn
                          aluguelId={aluguel.id}
                          status={aluguel.status}
                          mesReferencia={aluguel.mes_referencia.slice(0, 7)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>

          {/* Rodapé com link */}
          <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
            <Link
              href="/alugueis"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Ver todos os aluguéis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Coluna direita — empilhada */}
        <div className="space-y-5">
          {/* Próximos vencimentos */}
          <Card>
            <CardHeader className="pb-0 pt-5 px-6">
              <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />Próximos 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              {!proximosVencimentos?.length ? (
                <div className="flex flex-col items-center justify-center gap-1.5 px-5 py-6">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-700">Tudo em dia</p>
                  <p className="text-xs text-slate-400 text-center">Nenhum vencimento nos próximos 7 dias</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#F1F5F9]">
                    {vencimentosVisiveis.map(aluguel => {
                      const dias = diasParaVencer(aluguel.data_vencimento)
                      const urg = urgenciaBadge(dias, aluguel.status)
                      return (
                        <div key={aluguel.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] truncate leading-tight">
                              {aluguel.imovel?.apelido ?? 'Imóvel'}
                            </p>
                            <p className="text-xs text-slate-400 truncate leading-tight">
                              {aluguel.inquilino?.nome ?? 'Sem inquilino'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', urg.cls)}>
                              {urg.label}
                            </span>
                            <p className="text-sm font-bold text-[#0F172A] w-18 text-right">
                              {formatarMoeda(aluguel.valor)}
                            </p>
                            <Link
                              href={`/alugueis?mes=${aluguel.mes_referencia.slice(0, 7)}&cobrar=${aluguel.id}`}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors"
                            >
                              Cobrar
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {temMaisVencimentos && (
                    <div className="px-5 py-2 border-t border-slate-100">
                      <Link href="/alugueis" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                        Ver mais →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Atividade recente */}
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader className="pb-0 pt-5 px-6">
              <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />Atividade recente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              {!atividadeRecente?.length ? (
                <p className="px-5 py-4 text-sm text-[#94A3B8] text-center">Nenhum pagamento recente.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {atividadeRecente.map(aluguel => {
                    const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                    const [ano, mes] = aluguel.mes_referencia.split('-').map(Number)
                    const labelMesAtiv = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                      .format(new Date(ano, mes - 1, 1))
                    const iconCfg = ATIVIDADE_ICON_CONFIG.pagamento
                    return (
                      <div key={aluguel.id} className="flex items-center gap-3 px-5 py-3">
                        {/* Ícone colorido */}
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', iconCfg.bg)}>
                          <CheckCircle className={cn('h-3.5 w-3.5', iconCfg.text)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#0F172A] truncate leading-tight">{nomeInq}</p>
                          <p className="text-[11px] text-slate-400 truncate leading-tight">
                            {aluguel.imovel?.apelido} · {labelMesAtiv}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-emerald-600">+{formatarMoeda(aluguel.valor)}</p>
                          {aluguel.data_pagamento && (
                            <p className="text-[10px] text-slate-400">{tempoRelativo(aluguel.data_pagamento)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contratos próximos do vencimento */}
          {(contratosVencendo?.length ?? 0) > 0 && (
            <Card className="rounded-2xl border-amber-200 bg-amber-50/30 shadow-sm">
              <CardHeader className="pb-0 pt-5 px-6">
                <CardTitle className="text-[11px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />Contratos vencendo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                <div className="divide-y divide-[#F1F5F9]">
                  {contratosVencendo!.map(imovel => {
                    const fim = new Date(imovel.data_fim_contrato + 'T00:00:00')
                    const hoje2 = new Date(); hoje2.setHours(0, 0, 0, 0)
                    const dias = Math.round((fim.getTime() - hoje2.getTime()) / 86_400_000)
                    const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
                    return (
                      <div key={imovel.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-amber-100">
                          <FileText className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0F172A] truncate leading-tight">{imovel.apelido}</p>
                          <p className="text-xs text-slate-400 truncate leading-tight">{inquilinoAtivo?.nome ?? 'Sem inquilino'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-amber-600">Vence em {dias}d</span>
                          <Link href="/imoveis" className="text-xs text-emerald-600 hover:underline font-medium">Ver →</Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reajustes próximos */}
          {(proximosReajustes?.length ?? 0) > 0 && (
            <ReajusteAlertas imoveis={(proximosReajustes ?? []) as import('@/components/dashboard/reajuste-alertas').ImovelReajuste[]} />
          )}
        </div>
      </div>

      {/* ── GRÁFICO DE RECEITA ── full width, em destaque */}
      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="pt-6 px-7 pb-2">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <CardTitle
                className="font-bold text-slate-900"
                style={{ letterSpacing: '-0.015em', fontSize: 'clamp(20px, 2vw, 26px)' }}
              >
                Receita dos últimos 6 meses
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Total recebido por mês</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">Acumulado</p>
              <p
                className="font-extrabold leading-none mt-1"
                style={{
                  fontSize: 'clamp(22px, 2.5vw, 32px)',
                  background: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatarMoeda(chartData.reduce((s, d) => s + d.total, 0))}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-7 pb-6 pt-3">
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

      {/* ── COBRANÇAS PREVISTAS — próximos 2 meses ── */}
      {proximasCobrancas.length > 0 && (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pt-6 px-7 pb-2">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <CardTitle
                  className="font-bold text-slate-900"
                  style={{ letterSpacing: '-0.015em', fontSize: 'clamp(20px, 2vw, 26px)' }}
                >
                  Cobranças previstas
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">Previsão calculada a partir dos imóveis ativos</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-7 pb-6 pt-3">
            <div className="grid gap-4 sm:grid-cols-2">
              {proximasCobrancas.map(m => (
                <Link
                  key={m.mes}
                  href={`/alugueis?mes=${m.mes}`}
                  className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white hover:from-emerald-50 hover:to-white hover:border-emerald-200 transition-all p-5 block group hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Próximo mês</p>
                      <p className="text-base font-bold text-slate-900 group-hover:text-emerald-700">{m.mesLabel}</p>
                    </div>
                    <p className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-700" style={{ letterSpacing: '-0.02em' }}>
                      {formatarMoeda(m.total)}
                    </p>
                  </div>
                  <div className="space-y-1.5 pb-2">
                    {m.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-500 py-1 border-b border-slate-100 last:border-0">
                        <span className="truncate max-w-[60%]">
                          <span className="font-medium text-slate-700">{item.apelido}</span>
                          <span className="text-slate-400"> · {item.inquilino}</span>
                        </span>
                        <span className="font-semibold text-slate-600 shrink-0 ml-2">
                          dia {item.dia} · {formatarMoeda(item.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-emerald-600 font-semibold mt-3 group-hover:underline flex items-center gap-1">
                    Ver cobranças de {m.mesLabel.split(' ')[0].toLowerCase()}
                    <ArrowRight className="h-3 w-3" />
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
