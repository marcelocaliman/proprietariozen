'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, TrendingUp, DollarSign, Building2, Receipt,
  RefreshCw, AlertTriangle, CheckCircle2, Info, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Minus, Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserGrowthChart } from '@/components/admin/user-growth-chart'
import { PlanPieChart } from '@/components/admin/plan-pie-chart'
import { cn } from '@/lib/utils'
import { formatLogDetails } from '@/lib/log-format'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type StatsData = {
  users: {
    total: number; total_gratis: number; total_master: number; total_elite: number; total_pro: number
    usuarios_ativos_30d: number; novos_hoje: number; novos_semana: number
    novos_mes: number; crescimento_vs_mes_anterior: number
    taxa_conversao: number; churn_mes: number
  }
  app: {
    total_imoveis: number; total_inquilinos: number
    total_alugueis_mes: number; total_recebido_mes: number; taxa_inadimplencia: number
  }
  mrr: {
    mrr_atual: number; mrr_mes_anterior: number
    crescimento_mrr: number; arr: number; ltv_medio: number
  }
  growth_series: { date: string; label: string; total: number; pro: number }[]
  recent_activity: {
    id: string
    user_id: string | null
    user_email: string | null
    user_nome: string | null
    action: string
    details: unknown
    ip_address: string | null
    created_at: string
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}
function fmtCompact(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return fmt(v)
}
function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-100', className)} />
}
function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, trend, icon: Icon, iconCls,
}: {
  title: string; value: string | number; sub?: string
  trend?: number; icon: typeof Users; iconCls: string
}) {
  const TrendIcon = trend == null ? Minus
    : trend > 0 ? ArrowUpRight
    : ArrowDownRight
  const trendCls = trend == null ? 'text-slate-400'
    : trend > 0 ? 'text-emerald-600'
    : 'text-red-600'

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-[#94A3B8] font-medium uppercase tracking-wide truncate">{title}</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-[#64748B] mt-0.5 truncate">{sub}</p>}
          </div>
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconCls)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        </div>
        {trend != null && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trendCls)}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(trend)}% vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminVisaoGeralPage() {
  const [data, setData]       = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [now, setNow]         = useState(() => new Date())

  const fetchStats = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#0F172A]">Visão Geral</h1>
            <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] font-bold px-2">
              ADMIN MODE
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {now.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Atualizar dados
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} — <button onClick={fetchStats} className="underline">tentar novamente</button>
        </div>
      )}

      {/* ── Linha 1: KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {loading ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />) : data && (<>
          <KpiCard
            title="Total de usuários"
            value={data.users.total.toLocaleString('pt-BR')}
            sub={`+${data.users.novos_hoje} hoje`}
            trend={data.users.crescimento_vs_mes_anterior}
            icon={Users}
            iconCls="bg-blue-50 text-blue-600"
          />
          <KpiCard
            title="Pagantes"
            value={data.users.total_pro.toLocaleString('pt-BR')}
            sub={`${data.users.total_master ?? 0} Master · ${data.users.total_elite ?? 0} Elite`}
            icon={ShieldAlert}
            iconCls="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            title="MRR"
            value={fmtCompact(data.mrr.mrr_atual)}
            sub={`ARR ${fmtCompact(data.mrr.arr)}`}
            trend={data.mrr.crescimento_mrr}
            icon={DollarSign}
            iconCls="bg-amber-50 text-amber-600"
          />
          <KpiCard
            title="Imóveis ativos"
            value={data.app.total_imoveis.toLocaleString('pt-BR')}
            sub={`${data.app.total_inquilinos} inquilinos`}
            icon={Building2}
            iconCls="bg-violet-50 text-violet-600"
          />
          <KpiCard
            title="Aluguéis este mês"
            value={data.app.total_alugueis_mes.toLocaleString('pt-BR')}
            sub={`${fmt(data.app.total_recebido_mes)} recebidos`}
            icon={Receipt}
            iconCls="bg-cyan-50 text-cyan-600"
          />
        </>)}
      </div>

      {/* ── Linha 2: Gráficos 60/40 ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Crescimento — 60% */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Crescimento de usuários
              <span className="text-[11px] text-[#94A3B8] font-normal">últimos 30 dias</span>
            </CardTitle>
            <div className="flex items-center gap-4 text-[11px] text-[#64748B] mt-1">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Total</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Master</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading
              ? <Skeleton className="h-[220px] w-full" />
              : <UserGrowthChart data={data?.growth_series ?? []} />
            }
          </CardContent>
        </Card>

        {/* Distribuição — 40% */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Distribuição de planos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex items-center justify-center min-h-[220px]">
            {loading
              ? <Skeleton className="h-[180px] w-[180px] rounded-full" />
              : <PlanPieChart gratis={data?.users.total_gratis ?? 0} pro={data?.users.total_master ?? 0} elite={data?.users.total_elite ?? 0} />
            }
          </CardContent>
        </Card>
      </div>

      {/* ── Linha 3: Alertas ──────────────────────────────────────────────── */}
      {!loading && data && (() => {
        const alertas: React.ReactNode[] = []

        if (data.app.taxa_inadimplencia > 10) {
          alertas.push(
            <div key="inadimp" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">
                Taxa de inadimplência em <strong>{data.app.taxa_inadimplencia}%</strong> este mês.
              </p>
            </div>
          )
        }
        if (data.users.churn_mes > 5) {
          alertas.push(
            <div key="churn" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">
                <strong>{data.users.churn_mes}</strong> usuários fizeram downgrade este mês.
              </p>
            </div>
          )
        }
        alertas.push(
          <div key="novos" className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>{data.users.novos_semana}</strong> novos cadastros nos últimos 7 dias.
            </p>
          </div>
        )
        if (alertas.length === 1) {
          alertas.unshift(
            <div key="ok" className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-700">Tudo dentro do esperado — sem alertas críticos.</p>
            </div>
          )
        }
        return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{alertas}</div>
      })()}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      )}

      {/* ── Linha 4: Atividade recente ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Atividade recente</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !data?.recent_activity.length ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-[#475569]">Nada por aqui ainda</p>
              <p className="text-xs text-[#94A3B8] max-w-52">
                Os eventos vão aparecer aqui conforme os usuários usarem o app.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    {['Usuário', 'Ação', 'Detalhes', 'Data/hora'].map(col => (
                      <th key={col} className="text-left py-2 px-3 text-[#94A3B8] font-semibold uppercase tracking-wide text-[10px]">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {data.recent_activity.map(ev => {
                    const items = formatLogDetails(ev.details)
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 max-w-[180px]">
                          <p className="text-[#0F172A] font-medium truncate">{ev.user_nome ?? '—'}</p>
                          <p className="text-[10px] text-[#94A3B8] truncate">{ev.user_email ?? ev.user_id?.slice(0, 8) ?? '—'}</p>
                        </td>
                        <td className="py-2.5 px-3 text-[#0F172A] font-medium">{ev.action}</td>
                        <td className="py-2.5 px-3 text-[#64748B] max-w-[280px]">
                          {items.length === 0 ? '—' : (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {items.map(({ label, value }) => (
                                <span key={label} className="inline-flex items-baseline gap-1 whitespace-nowrap">
                                  <span className="text-[#94A3B8]">{label}:</span>
                                  <span className="text-[#475569] font-medium truncate max-w-[160px]">{value}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#94A3B8] whitespace-nowrap">{fmtDt(ev.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
