'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, RefreshCw, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MrrChart, type MrrMonth } from '@/components/admin/mrr-chart'
import { ConversionChart, type ConversionPoint } from '@/components/admin/conversion-chart'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type MonthData = MrrMonth & {
  mes: string; mes_label: string
  usuarios_pro: number; novos_pro: number; novos_total: number
  taxa_conversao: number; variacao_pct: number
}

type FinanceiroData = {
  months: MonthData[]
  projecoes: {
    taxa_crescimento_media: number
    mrr_3meses: number; mrr_6meses: number; mrr_12meses: number
    arr_projetado: number
  }
  totals: {
    mrr_atual: number; arr_atual: number
    total_acumulado: number; ltv_medio: number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number, decimais = 2) {
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: decimais, maximumFractionDigits: decimais,
  })
}
function fmtPct(v: number) {
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-100', className)} />
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({
  title, value, sub, highlight = false,
}: {
  title: string; value: string; sub?: string; highlight?: boolean
}) {
  return (
    <Card className={cn(highlight && 'border-emerald-200 bg-emerald-50')}>
      <CardContent className="pt-5 pb-4">
        <p className="text-[11px] text-[#94A3B8] font-medium uppercase tracking-wide">{title}</p>
        <p className={cn('text-2xl font-bold mt-1 tabular-nums', highlight ? 'text-emerald-700' : 'text-[#0F172A]')}>
          {value}
        </p>
        {sub && <p className="text-xs text-[#64748B] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['MRR & ARR', 'Conversão', 'Projeções'] as const
type Tab = typeof TABS[number]

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminFinanceiroPage() {
  const [data, setData]       = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('MRR & ARR')

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/financeiro')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const conversionSeries: ConversionPoint[] = (data?.months ?? []).map(m => ({
    mes_label: m.mes_label,
    taxa_conversao: m.taxa_conversao,
    total: m.novos_total,
    pro:   m.novos_pro,
  }))

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#0F172A]">Financeiro</h1>
            <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] font-bold px-2">ADMIN</Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">MRR, ARR, conversão e projeções</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={fetchData} disabled={loading}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} — <button onClick={fetchData} className="underline">tentar novamente</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              tab === t
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: MRR & ARR ─────────────────────────────────────────────────── */}
      {tab === 'MRR & ARR' && (
        <div className="space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 pb-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            )) : data && (<>
              <MetricCard
                title="MRR Atual"
                value={fmt(data.totals.mrr_atual)}
                sub={data.months[data.months.length - 1]
                  ? `${fmtPct(data.months[data.months.length - 1].variacao_pct)} vs mês anterior`
                  : undefined}
                highlight
              />
              <MetricCard title="ARR" value={fmt(data.totals.arr_atual)} sub="Anualizado" />
              <MetricCard
                title="LTV Médio"
                value={fmt(data.totals.ltv_medio)}
                sub="Estimado (12 meses)"
              />
              <MetricCard title="Ticket Médio" value={fmt(49.90)} sub="Plano Master / mês" />
            </>)}
          </div>

          {/* Gráfico MRR */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Evolução do MRR — últimos 12 meses
                <span className="text-[11px] text-[#94A3B8] font-normal">Barra: bruto · Linha: líquido</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading
                ? <Skeleton className="h-[280px] w-full" />
                : <MrrChart data={data?.months ?? []} />
              }
            </CardContent>
          </Card>

          {/* Tabela histórico */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0F172A]">Histórico mensal</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]">
                        {['Mês', 'Usuários Pro', 'MRR Bruto', 'Churn', 'MRR Líquido', 'Variação'].map(col => (
                          <th key={col} className="text-left py-2 px-3 text-[#94A3B8] font-semibold uppercase tracking-wide text-[10px]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {(data?.months ?? []).map(m => (
                        <tr key={m.mes} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-[#0F172A] font-medium">{m.mes_label}</td>
                          <td className="py-2.5 px-3 text-[#475569] tabular-nums">{m.usuarios_pro}</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-medium tabular-nums">{fmt(m.mrr_bruto)}</td>
                          <td className="py-2.5 px-3 text-[#94A3B8] tabular-nums">
                            {m.churn_valor > 0 ? <span className="text-red-600">-{fmt(m.churn_valor)}</span> : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-amber-700 tabular-nums">{fmt(m.mrr_liquido)}</td>
                          <td className="py-2.5 px-3 tabular-nums">
                            <span className={cn(
                              'font-semibold',
                              m.variacao_pct > 0 ? 'text-emerald-600'
                                : m.variacao_pct < 0 ? 'text-red-600'
                                : 'text-[#94A3B8]',
                            )}>
                              {m.variacao_pct !== 0 ? fmtPct(m.variacao_pct) : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Totais */}
                      {data && (
                        <tr className="border-t-2 border-[#E2E8F0] bg-slate-50">
                          <td className="py-2.5 px-3 text-[#64748B] font-semibold text-[11px] uppercase">Total</td>
                          <td className="py-2.5 px-3 text-[#0F172A] font-bold">{data.months[data.months.length - 1]?.usuarios_pro ?? 0}</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold tabular-nums">{fmt(data.totals.total_acumulado)}</td>
                          <td className="py-2.5 px-3 text-[#94A3B8]">—</td>
                          <td className="py-2.5 px-3 text-amber-700 font-bold tabular-nums">{fmt(data.totals.total_acumulado)}</td>
                          <td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Conversão ─────────────────────────────────────────────────── */}
      {tab === 'Conversão' && (
        <div className="space-y-5">
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 pb-4 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-20" />
                </CardContent>
              </Card>
            )) : data && (() => {
              const taxa = data.months[data.months.length - 1]?.taxa_conversao ?? 0
              const meta = 10
              const gap  = Math.max(0, meta - taxa)
              return (<>
                <MetricCard title="Taxa de conversão atual" value={`${taxa.toFixed(1)}%`} sub="Novos Pro / Novos cadastros" />
                <MetricCard title="Meta de conversão" value={`${meta}%`} sub="Benchmark SaaS" />
                <Card className={cn(gap > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-[11px] text-[#94A3B8] font-medium uppercase tracking-wide">Gap para meta</p>
                    <p className={cn('text-2xl font-bold mt-1', gap > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                      {gap > 0 ? `${gap.toFixed(1)}pp` : 'Atingida ✓'}
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {gap > 0 ? `Faltam ${gap.toFixed(1)} pp para ${meta}%` : 'Acima da meta'}
                    </p>
                  </CardContent>
                </Card>
              </>)
            })()}
          </div>

          {/* Gráfico */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-500" />
                Taxa de conversão mês a mês
                <span className="text-[11px] text-[#94A3B8] font-normal">Linha pontilhada = meta 10%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading
                ? <Skeleton className="h-[220px] w-full" />
                : <ConversionChart data={conversionSeries} meta={10} />
              }
            </CardContent>
          </Card>

          {/* Funil */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0F172A]">Funil de conversão</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : data && (() => {
                const total = data.months.reduce((s, m) => s + m.novos_total, 0)
                const pro   = data.months.reduce((s, m) => s + m.novos_pro, 0)
                const steps = [
                  { label: 'Total de cadastros', value: total, pct: 100 },
                  { label: 'Visitaram /planos',  value: null,  pct: null },
                  { label: 'Iniciaram checkout', value: null,  pct: null },
                  { label: 'Converteram (Pro)',  value: pro,   pct: total > 0 ? Math.round(pro / total * 100) : 0 },
                ]
                return (
                  <div className="space-y-2 py-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className="h-8 rounded flex items-center px-3 text-xs font-medium text-white bg-[#1E293B]"
                          style={{ width: step.pct != null ? `${Math.max(step.pct, 20)}%` : '60%', minWidth: 160 }}
                        >
                          {step.label}
                        </div>
                        <span className="text-sm font-bold text-[#0F172A] tabular-nums">
                          {step.value != null
                            ? step.value.toLocaleString('pt-BR')
                            : <span className="text-[#94A3B8] text-xs font-normal">N/A (sem analytics)</span>}
                        </span>
                        {step.pct != null && step.value != null && (
                          <Badge className="bg-slate-100 text-[#475569] hover:bg-slate-100 text-[10px] border border-[#E2E8F0]">
                            {step.pct}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Projeções ─────────────────────────────────────────────────── */}
      {tab === 'Projeções' && (
        <div className="space-y-5">
          {/* Disclaimer */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <DollarSign className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              Baseado na taxa de crescimento média dos últimos 3 meses
              {data && ` (${fmtPct(data.projecoes.taxa_crescimento_media)}/mês)`}.
              Estimativas simplificadas para MVP — não consideram churn, sazonalidade ou novos produtos.
            </p>
          </div>

          {/* Cards de projeção */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 pb-4 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            )) : data && ([
              { label: 'MRR em 3 meses',  value: data.projecoes.mrr_3meses,  arr: data.projecoes.mrr_3meses * 12 },
              { label: 'MRR em 6 meses',  value: data.projecoes.mrr_6meses,  arr: data.projecoes.mrr_6meses * 12 },
              { label: 'MRR em 12 meses', value: data.projecoes.mrr_12meses, arr: data.projecoes.arr_projetado },
            ].map((item, i) => (
              <Card key={i} className={cn(i === 2 && 'border-emerald-200 bg-emerald-50')}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-[11px] text-[#94A3B8] font-medium uppercase tracking-wide">{item.label}</p>
                  <p className={cn('text-3xl font-bold mt-2 tabular-nums', i === 2 ? 'text-emerald-700' : 'text-[#0F172A]')}>
                    {fmt(item.value)}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    ARR projetado: <span className="text-[#475569] font-medium">{fmt(item.arr)}</span>
                  </p>
                  {i > 0 && data && (
                    <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                      +{fmt(item.value - data.totals.mrr_atual)} vs hoje
                    </p>
                  )}
                </CardContent>
              </Card>
            )))}
          </div>

          {/* Tabela resumo */}
          {!loading && data && (
            <Card>
              <CardContent className="pt-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-left">
                      <th className="pb-2 text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide">Horizonte</th>
                      <th className="pb-2 text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide">MRR Estimado</th>
                      <th className="pb-2 text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide">ARR Estimado</th>
                      <th className="pb-2 text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide">Crescimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {[
                      { label: 'Hoje',     mrr: data.totals.mrr_atual,        arr: data.totals.arr_atual },
                      { label: '3 meses',  mrr: data.projecoes.mrr_3meses,    arr: data.projecoes.mrr_3meses * 12 },
                      { label: '6 meses',  mrr: data.projecoes.mrr_6meses,    arr: data.projecoes.mrr_6meses * 12 },
                      { label: '12 meses', mrr: data.projecoes.mrr_12meses,   arr: data.projecoes.arr_projetado },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 text-[#0F172A] font-medium">{row.label}</td>
                        <td className="py-2.5 text-emerald-700 font-bold tabular-nums">{fmt(row.mrr)}</td>
                        <td className="py-2.5 text-[#475569] tabular-nums">{fmt(row.arr)}</td>
                        <td className="py-2.5 text-[#64748B] tabular-nums">
                          {i === 0 ? '—' : (
                            <span className="text-emerald-600 font-medium">
                              {fmtPct(((row.mrr - data.totals.mrr_atual) / Math.max(data.totals.mrr_atual, 1)) * 100)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
